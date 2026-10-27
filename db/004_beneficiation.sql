-- RUMO CAFÉ 004 — remessas e retornos do beneficiamento terceirizado
-- Cadastro documental, não movimenta estoque automaticamente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.beneficiation_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enterprise_id uuid NOT NULL REFERENCES public.enterprises(id),
 provider_name text NOT NULL,
 external_reference text,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 notes text,
 UNIQUE(id,enterprise_id)
);
CREATE TABLE IF NOT EXISTS public.beneficiation_shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL,
 enterprise_id uuid NOT NULL,
 source_lot_id uuid NOT NULL,
 shipped_at timestamptz NOT NULL,
 sack_count integer CHECK(sack_count > 0),
 shipped_weight_kg numeric(18,4) CHECK(shipped_weight_kg > 0),
 shipped_weight_basis text CHECK(shipped_weight_basis IN ('measured','estimated')),
 provider_received_weight_kg numeric(18,4) CHECK(provider_received_weight_kg > 0),
 provider_weighed_at timestamptz,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 FOREIGN KEY(order_id,enterprise_id) REFERENCES public.beneficiation_orders(id,enterprise_id),
 FOREIGN KEY(source_lot_id,enterprise_id) REFERENCES public.lots(id,enterprise_id),
 CHECK(sack_count IS NOT NULL OR shipped_weight_kg IS NOT NULL),
 CHECK((shipped_weight_kg IS NULL)=(shipped_weight_basis IS NULL)),
 CHECK((provider_received_weight_kg IS NULL)=(provider_weighed_at IS NULL)),
 UNIQUE(id,enterprise_id)
);
CREATE TABLE IF NOT EXISTS public.beneficiation_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 shipment_id uuid NOT NULL,
 enterprise_id uuid NOT NULL,
 destination_lot_id uuid NOT NULL,
 returned_at timestamptz NOT NULL,
 sieve_grade text NOT NULL,
 weight_kg numeric(18,4) NOT NULL CHECK(weight_kg > 0),
 weight_basis text NOT NULL CHECK(weight_basis IN ('measured','estimated')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 notes text,
 FOREIGN KEY(shipment_id,enterprise_id) REFERENCES public.beneficiation_shipments(id,enterprise_id),
 FOREIGN KEY(destination_lot_id,enterprise_id) REFERENCES public.lots(id,enterprise_id)
);
CREATE INDEX IF NOT EXISTS beneficiation_returns_shipment_idx
 ON public.beneficiation_returns(shipment_id);
ALTER TABLE public.beneficiation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiation_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiation_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiation_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiation_shipments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiation_returns FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.beneficiation_orders,public.beneficiation_shipments,
 public.beneficiation_returns FROM anon,authenticated;
COMMIT;
