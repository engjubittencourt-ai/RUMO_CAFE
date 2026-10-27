-- RUMO CAFÉ | 002 | gravação atômica de lotes e movimentações
-- Executar após 001_foundation.sql em projeto Supabase controlado.
-- SECURITY DEFINER: não aceitar actor_id vindo do cliente; sempre auth.uid().
BEGIN;

-- Travas lógicas por empreendimento serializam operações de estoque.
-- SECURITY DEFINER só deve ser criado/gerido por administrador confiável.
CREATE OR REPLACE FUNCTION public.rumo_create_lot(
 p_enterprise uuid, p_code text, p_state text,
 p_unit text, p_opening_quantity numeric DEFAULT 0,
 p_basis text DEFAULT 'counted', p_justification text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_actor uuid := auth.uid(); v_lot uuid; v_movement uuid;
BEGIN
 IF v_actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM enterprise_members
   WHERE enterprise_id=p_enterprise AND user_id=v_actor
 ) THEN RAISE EXCEPTION 'Não autorizado'; END IF;
 IF NOT EXISTS (SELECT 1 FROM enterprises WHERE id=p_enterprise AND status='approved')
 THEN RAISE EXCEPTION 'Empreendimento não aprovado'; END IF;
 IF p_code IS NULL OR btrim(p_code)='' OR p_state NOT IN ('coco','pergaminho','verde','torrado','moido')
 THEN RAISE EXCEPTION 'Código ou estado inválido'; END IF;
 IF p_unit NOT IN ('saca','kg') OR p_basis NOT IN ('counted','measured','estimated')
 THEN RAISE EXCEPTION 'Unidade ou base inválida'; END IF;
 IF p_opening_quantity IS NULL OR p_opening_quantity < 0 OR
    (p_unit='saca' AND p_opening_quantity<>trunc(p_opening_quantity))
 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_enterprise::text,0));
 INSERT INTO lots(enterprise_id,code,state)
 VALUES(p_enterprise,btrim(p_code),p_state) RETURNING id INTO v_lot;
 IF p_opening_quantity>0 THEN
   IF btrim(coalesce(p_justification,''))='' THEN
     RAISE EXCEPTION 'Abertura com estoque exige origem documentada';
   END IF;
   INSERT INTO movements(enterprise_id,kind,actor_id,justification)
   VALUES(p_enterprise,'opening',v_actor,p_justification) RETURNING id INTO v_movement;
   INSERT INTO movement_lines(movement_id,enterprise_id,lot_id,direction,quantity,unit,basis)
   VALUES(v_movement,p_enterprise,v_lot,'in',p_opening_quantity,p_unit,p_basis);
 END IF;
 RETURN v_lot;
END $$;

-- Movimentos conservativos: split / merge / transfer.
-- Transformações com rendimento e conversão de unidade serão implementadas
-- somente após modelagem da reconciliação de massa.
CREATE OR REPLACE FUNCTION public.rumo_move(
 p_enterprise uuid, p_kind text, p_inputs jsonb, p_outputs jsonb,
 p_justification text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
 v_actor uuid := auth.uid(); v_movement uuid; v_row record;
 v_in numeric; v_out numeric; v_unit text; v_state text;
 v_states int; v_units int;
BEGIN
 IF v_actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM enterprise_members
   WHERE enterprise_id=p_enterprise AND user_id=v_actor
 ) THEN RAISE EXCEPTION 'Não autorizado'; END IF;
 IF NOT EXISTS (SELECT 1 FROM enterprises WHERE id=p_enterprise AND status='approved')
 THEN RAISE EXCEPTION 'Empreendimento não aprovado'; END IF;
 IF p_kind NOT IN ('split','merge','transfer') THEN
   RAISE EXCEPTION 'Operação não habilitada'; END IF;
 IF jsonb_typeof(p_inputs) IS DISTINCT FROM 'array' OR jsonb_array_length(p_inputs)=0
 OR jsonb_typeof(p_outputs) IS DISTINCT FROM 'array' OR jsonb_array_length(p_outputs)=0
 THEN RAISE EXCEPTION 'Entradas e saídas obrigatórias'; END IF;

 PERFORM pg_advisory_xact_lock(hashtextextended(p_enterprise::text,0));

 CREATE TEMP TABLE IF NOT EXISTS rumo_operation_rows (
   direction text, lot_id uuid, quantity numeric, unit text, basis text
 ) ON COMMIT DROP;
 TRUNCATE pg_temp.rumo_operation_rows;
 BEGIN
   INSERT INTO pg_temp.rumo_operation_rows
   SELECT 'out',x.lot_id,x.quantity,x.unit,x.basis
   FROM jsonb_to_recordset(p_inputs) AS x(lot_id uuid,quantity numeric,unit text,basis text);
   INSERT INTO pg_temp.rumo_operation_rows
   SELECT 'in',x.lot_id,x.quantity,x.unit,x.basis
   FROM jsonb_to_recordset(p_outputs) AS x(lot_id uuid,quantity numeric,unit text,basis text);
 EXCEPTION WHEN others THEN
   RAISE EXCEPTION 'Linhas de movimento malformadas';
 END;
 IF EXISTS (SELECT 1 FROM pg_temp.rumo_operation_rows r
   LEFT JOIN lots l ON l.id=r.lot_id AND l.enterprise_id=p_enterprise
   WHERE l.id IS NULL OR r.quantity IS NULL OR r.quantity<=0
   OR r.unit NOT IN ('kg','saca') OR r.unit IS NULL
   OR r.basis NOT IN ('measured','estimated','counted') OR r.basis IS NULL
   OR (r.unit='saca' AND r.quantity<>trunc(r.quantity))
 ) THEN RAISE EXCEPTION 'Lote, unidade ou quantidade inválidos'; END IF;
 SELECT count(DISTINCT l.state), count(DISTINCT r.unit)
 INTO v_states,v_units FROM pg_temp.rumo_operation_rows r JOIN lots l ON l.id=r.lot_id;
 IF v_states<>1 OR v_units<>1 THEN
   RAISE EXCEPTION 'Movimentos conservativos exigem mesmo estado físico e unidade'; END IF;
 SELECT sum(quantity) INTO v_in FROM pg_temp.rumo_operation_rows WHERE direction='out';
 SELECT sum(quantity) INTO v_out FROM pg_temp.rumo_operation_rows WHERE direction='in';
 IF v_in<>v_out THEN RAISE EXCEPTION 'Quantidade não conservada'; END IF;

 -- Proíbe usar o mesmo lote na entrada e na saída: evita auto-arestas
 -- e torna a genealogia acíclica quando lotes derivados são criados vazios.
 IF EXISTS (
   SELECT 1 FROM pg_temp.rumo_operation_rows a JOIN pg_temp.rumo_operation_rows b
   ON a.lot_id=b.lot_id WHERE a.direction='out' AND b.direction='in'
 ) THEN RAISE EXCEPTION 'Origem e destino devem ser lotes diferentes'; END IF;

 -- Lotes de destino precisam estar vazios para evitar misturas retroativas
 -- que invalidariam a genealogia de material já expedido.
 IF EXISTS (
   SELECT 1 FROM pg_temp.rumo_operation_rows r
   JOIN lot_balances b ON b.lot_id=r.lot_id AND b.enterprise_id=p_enterprise
   WHERE r.direction='in' AND b.quantity<>0
 ) THEN RAISE EXCEPTION 'Destino deve ser lote novo com saldo zero'; END IF;

 IF EXISTS (
   SELECT 1 FROM (
     SELECT lot_id,unit,sum(quantity) requested
     FROM pg_temp.rumo_operation_rows WHERE direction='out' GROUP BY lot_id,unit
   ) r LEFT JOIN lot_balances b ON b.lot_id=r.lot_id AND b.unit=r.unit AND b.enterprise_id=p_enterprise
   WHERE coalesce(b.quantity,0)<r.requested
 ) THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

 INSERT INTO movements(enterprise_id,kind,actor_id,justification)
 VALUES(p_enterprise,p_kind,v_actor,coalesce(p_justification,'')) RETURNING id INTO v_movement;
 INSERT INTO movement_lines(movement_id,enterprise_id,lot_id,direction,quantity,unit,basis)
 SELECT v_movement,p_enterprise,lot_id,
 CASE WHEN direction='out' THEN 'out' ELSE 'in' END,quantity,unit,basis
 FROM pg_temp.rumo_operation_rows;
 RETURN v_movement;
END $$;

REVOKE ALL ON FUNCTION public.rumo_create_lot(uuid,text,text,text,numeric,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rumo_move(uuid,text,jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rumo_create_lot(uuid,text,text,text,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rumo_move(uuid,text,jsonb,jsonb,text) TO authenticated;
COMMIT;
