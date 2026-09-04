-- FutolTech Structural Lab — Price Intelligence v1
-- Prepared migration only. Do not apply to an unrelated Supabase project.
-- Price evidence is economic provenance; it must never mutate engineering properties.

create extension if not exists pgcrypto;

create table if not exists public.price_products (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  product_category text not null,
  trade_size text,
  depth_mm numeric,
  flange_mm numeric,
  thickness_mm numeric,
  stock_length_m numeric check (stock_length_m is null or stock_length_m > 0),
  manufacturer text,
  supplier_product_ref text,
  match_scope text not null default 'economic-identity-only',
  engineering_equivalence boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.price_products is
  'Economic product identities used to match market prices. A match is not engineering equivalence and must not upgrade section/material data.';

create table if not exists public.price_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('started','completed','partial','failed')),
  query_scope jsonb not null default '{}'::jsonb,
  observation_count integer not null default 0 check (observation_count >= 0),
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  external_observation_key text unique,
  product_id uuid not null references public.price_products(id) on delete restrict,
  refresh_run_id uuid references public.price_refresh_runs(id) on delete set null,
  source_type text not null check (source_type in ('online-retail-listing','supplier-quote','purchase-order','historical-reference')),
  supplier text not null,
  supplier_product text not null,
  supplier_reference text,
  source_url text,
  observed_at timestamptz not null,
  currency char(3) not null default 'PHP',
  unit text not null check (unit in ('stock-piece','kg','m','m2','m3','piece','bag','lot')),
  unit_price numeric not null check (unit_price > 0),
  stock_length_m numeric check (stock_length_m is null or stock_length_m > 0),
  availability text,
  location_scope text,
  tax_inclusion text,
  delivery_inclusion text,
  evidence_status text not null,
  raw_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.price_observations is
  'Append-only market observations. Never overwrite an older observation when a price changes; insert a new timestamped record.';

create index if not exists price_observations_product_time_idx
  on public.price_observations(product_id, observed_at desc);
create index if not exists price_observations_supplier_time_idx
  on public.price_observations(supplier, observed_at desc);

create table if not exists public.project_price_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_key text not null,
  structural_preset_id text not null,
  product_id uuid references public.price_products(id) on delete set null,
  supplier text,
  supplier_product text,
  source_reference text not null,
  source_document_url text,
  entered_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_until timestamptz,
  currency char(3) not null default 'PHP',
  unit text not null default 'stock-piece',
  unit_price numeric not null check (unit_price > 0),
  stock_length_m numeric check (stock_length_m is null or stock_length_m > 0),
  availability text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_price_overrides is
  'User/project-specific actual supplier/quote prices. Active project overrides outrank public web observations but do not delete or rewrite price history.';

create index if not exists project_price_overrides_lookup_idx
  on public.project_price_overrides(user_id, project_key, structural_preset_id, is_active, entered_at desc);

create or replace view public.latest_price_observations as
select distinct on (product_id, source_type, supplier)
  id, product_id, refresh_run_id, source_type, supplier, supplier_product,
  supplier_reference, source_url, observed_at, currency, unit, unit_price,
  stock_length_m, availability, location_scope, tax_inclusion, delivery_inclusion,
  evidence_status, raw_snapshot, created_at
from public.price_observations
order by product_id, source_type, supplier, observed_at desc, created_at desc;

alter table public.price_products enable row level security;
alter table public.price_refresh_runs enable row level security;
alter table public.price_observations enable row level security;
alter table public.project_price_overrides enable row level security;

-- Public read is appropriate for curated market observations used by a public comparison UI.
-- Writes remain unavailable to anon/authenticated clients unless a later admin/service policy is explicitly added.
create policy "public can read price products"
  on public.price_products for select using (true);
create policy "public can read price observations"
  on public.price_observations for select using (true);
create policy "public can read completed refresh runs"
  on public.price_refresh_runs for select using (status in ('completed','partial'));

create policy "users can read own project price overrides"
  on public.project_price_overrides for select
  using (auth.uid() = user_id);
create policy "users can insert own project price overrides"
  on public.project_price_overrides for insert
  with check (auth.uid() = user_id);
create policy "users can update own project price overrides"
  on public.project_price_overrides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "users can delete own project price overrides"
  on public.project_price_overrides for delete
  using (auth.uid() = user_id);

-- Future provider refresh should run server-side (Edge Function/service role), not from the browser.
-- The browser should never hold a service-role key.
