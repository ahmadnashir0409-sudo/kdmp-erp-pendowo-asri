-- Offtaker partner registry: extend existing business_partners without duplicating partner records.
alter table public.business_partners
  add column if not exists is_offtaker boolean not null default false,
  add column if not exists nama_pic text,
  add column if not exists email text,
  add column if not exists kategori_mitra text,
  add column if not exists wilayah_layanan text,
  add column if not exists komoditas_minat text[] not null default '{}',
  add column if not exists catatan text,
  add column if not exists is_active boolean not null default true;

create index if not exists business_partners_offtaker_active_idx
  on public.business_partners (is_active, nama)
  where is_offtaker = true;

drop policy if exists business_partners_pengurus_read on public.business_partners;
create policy business_partners_pengurus_read
  on public.business_partners
  for select to authenticated
  using (
    is_offtaker = true
    and (select private.current_user_role()) = 'pengurus'
  );

comment on column public.business_partners.is_offtaker is
  'Menandai mitra yang terdaftar dalam modul Offtaker KDMP.';
comment on column public.business_partners.komoditas_minat is
  'Daftar komoditas yang diminati mitra Offtaker; bukan master persediaan.';
