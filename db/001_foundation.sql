-- RUMO CAFÉ | PostgreSQL/Supabase | Foundation 001
-- SECURITY: RLS enabled, no permissive policies. No client writes until RPCs are reviewed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE enterprises (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 requested_by uuid NOT NULL REFERENCES auth.users(id),
 approved_by uuid REFERENCES auth.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE enterprise_members (
 enterprise_id uuid NOT NULL REFERENCES enterprises(id), user_id uuid NOT NULL REFERENCES auth.users(id),
 can_manage_members boolean NOT NULL DEFAULT false, PRIMARY KEY(enterprise_id,user_id)
);
CREATE TABLE extensionist_assignments (
 enterprise_id uuid NOT NULL REFERENCES enterprises(id), extensionist_id uuid NOT NULL REFERENCES auth.users(id),
 granted_by uuid NOT NULL REFERENCES auth.users(id), granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz, PRIMARY KEY(enterprise_id,extensionist_id,granted_at)
);
CREATE TABLE properties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 name text NOT NULL, latitude numeric(9,6), longitude numeric(9,6),
 CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
 CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
CREATE TABLE plots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid NOT NULL REFERENCES properties(id),
 code text NOT NULL, area_ha numeric(12,4) CHECK(area_ha > 0), UNIQUE(property_id,code)
);
CREATE TABLE harvests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 label text NOT NULL, starts_on date, ends_on date, UNIQUE(enterprise_id,label), UNIQUE(id,enterprise_id),
 CHECK(starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);
CREATE TABLE harvest_plot_varieties (
 harvest_id uuid NOT NULL REFERENCES harvests(id), plot_id uuid NOT NULL REFERENCES plots(id),
 variety text NOT NULL, PRIMARY KEY(harvest_id,plot_id,variety)
);
CREATE TABLE lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 code text NOT NULL, state text NOT NULL CHECK(state IN ('coco','pergaminho','verde','torrado','moido')),
 harvest_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(enterprise_id,code), UNIQUE(id,enterprise_id),
 FOREIGN KEY(harvest_id,enterprise_id) REFERENCES harvests(id,enterprise_id)
);
CREATE TABLE movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 kind text NOT NULL CHECK(kind IN ('opening','split','merge','transfer','transform','adjust','reverse')),
 actor_id uuid NOT NULL REFERENCES auth.users(id), occurred_at timestamptz NOT NULL DEFAULT now(),
 recorded_at timestamptz NOT NULL DEFAULT now(), justification text NOT NULL DEFAULT '',
 reverses_movement_id uuid REFERENCES movements(id), UNIQUE(id,enterprise_id),
 CHECK(kind NOT IN ('transform','adjust','reverse') OR length(trim(justification))>0)
);
CREATE TABLE movement_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), movement_id uuid NOT NULL, enterprise_id uuid NOT NULL,
 lot_id uuid NOT NULL, direction text NOT NULL CHECK(direction IN ('in','out')),
 quantity numeric(18,4) NOT NULL CHECK(quantity>0),
 unit text NOT NULL CHECK(unit IN ('saca','kg')),
 basis text NOT NULL CHECK(basis IN ('measured','estimated','counted')),
 note text,
 FOREIGN KEY(movement_id,enterprise_id) REFERENCES movements(id,enterprise_id),
 FOREIGN KEY(lot_id,enterprise_id) REFERENCES lots(id,enterprise_id),
 CHECK(unit<>'saca' OR quantity=trunc(quantity))
);
CREATE INDEX movement_lines_lot_idx ON movement_lines(lot_id);
CREATE VIEW lot_balances AS SELECT enterprise_id,lot_id,unit,
 sum(CASE WHEN direction='in' THEN quantity ELSE -quantity END) AS quantity
 FROM movement_lines GROUP BY enterprise_id,lot_id,unit;
CREATE TABLE quality_samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL, lot_id uuid NOT NULL,
 sampled_at timestamptz NOT NULL, protocol text NOT NULL, score numeric(7,3),
 evaluator text, notes text,
 FOREIGN KEY(lot_id,enterprise_id) REFERENCES lots(id,enterprise_id)
);
CREATE TABLE pop_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 code text NOT NULL, version text NOT NULL, title text NOT NULL,
 instructions text NOT NULL, frequency_description text NOT NULL,
 approved_at timestamptz, approved_by uuid REFERENCES auth.users(id),
 UNIQUE(enterprise_id,code,version), UNIQUE(id,enterprise_id)
);
CREATE TABLE pop_executions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enterprise_id uuid NOT NULL,
 pop_version_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES auth.users(id),
 performed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 outcome text NOT NULL CHECK(outcome IN ('done','partial','not_done')),
 checklist jsonb NOT NULL DEFAULT '{}'::jsonb, diary text NOT NULL DEFAULT '',
 FOREIGN KEY(pop_version_id,enterprise_id) REFERENCES pop_versions(id,enterprise_id)
);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, enterprise_id uuid NOT NULL REFERENCES enterprises(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id), entity_type text NOT NULL,
 entity_id uuid NOT NULL, action text NOT NULL, previous_value jsonb,
 new_value jsonb, justification text NOT NULL DEFAULT '',
 recorded_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['enterprises','enterprise_members','extensionist_assignments',
 'properties','plots','harvests','harvest_plot_varieties','lots','movements','movement_lines',
 'quality_samples','pop_versions','pop_executions','audit_events'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
COMMIT;
