-- 도매 업체 관리 표 (엘라·VMCE 사이트별로 system 칸으로 나눔)
-- Supabase → SQL Editor 에 통째로 붙여넣고 Run
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  system text not null,
  name text not null,
  url text,
  categories text[] not null default '{}',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vendors_system on vendors(system, updated_at desc);
