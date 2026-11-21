-- Align cooperative membership roles with the canonical profiles.role values.
-- Existing production membership rows were checked: only manajer is currently present.
ALTER TABLE public.cooperative_memberships
  DROP CONSTRAINT IF EXISTS cooperative_memberships_role_check;

ALTER TABLE public.cooperative_memberships
  ADD CONSTRAINT cooperative_memberships_role_check
  CHECK (role IN ('manajer','admin_keuangan','kasir','admin_gudang','pengurus'));
