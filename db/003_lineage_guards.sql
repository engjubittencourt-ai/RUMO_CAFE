-- RUMO CAFÉ 003: impedir adição retroativa a lotes já consumidos
-- Esta migração ainda precisa de testes de integração antes de implantação.
BEGIN;
CREATE OR REPLACE FUNCTION public.rumo_check_lot_lineage()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp
AS $$
BEGIN
 IF NEW.direction='in' AND EXISTS (
   SELECT 1 FROM public.movement_lines
   WHERE lot_id=NEW.lot_id AND direction='out'
 ) THEN
   RAISE EXCEPTION 'Lote consumido não pode receber novas entradas';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rumo_lineage_guard ON public.movement_lines;
CREATE TRIGGER rumo_lineage_guard
BEFORE INSERT ON public.movement_lines
FOR EACH ROW EXECUTE FUNCTION public.rumo_check_lot_lineage();
REVOKE ALL ON FUNCTION public.rumo_check_lot_lineage() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.lot_balances FROM PUBLIC,anon,authenticated;
COMMIT;
