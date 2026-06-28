-- Schema inicial para o app Dai de Açúcar Gestão
-- Stack: Supabase (Postgres + Auth) + Vercel

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  business_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_monthly numeric(10,2) not null default 0,
  recipe_limit integer,
  ingredient_limit integer,
  has_advanced_history boolean not null default false,
  has_export boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'active' check (status in ('active', 'canceled', 'trial', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  gateway_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text,
  purchase_quantity numeric(12,3) not null,
  purchase_unit text not null check (purchase_unit in ('g', 'kg', 'ml', 'l', 'un')),
  purchase_price numeric(12,2) not null,
  unit_cost numeric(12,6) not null,
  supplier text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  old_price numeric(12,2),
  new_price numeric(12,2) not null,
  old_unit_cost numeric(12,6),
  new_unit_cost numeric(12,6) not null,
  changed_at timestamptz not null default now(),
  change_reason text
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text,
  yield_quantity numeric(12,3) not null default 1,
  yield_unit text not null check (yield_unit in ('un', 'fatia', 'pote', 'kg')),
  preparation_notes text,
  total_ingredient_cost numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity_used numeric(12,3) not null,
  unit_used text not null check (unit_used in ('g', 'kg', 'ml', 'l', 'un')),
  unit_cost_snapshot numeric(12,6) not null,
  total_cost numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  default_labor_cost numeric(12,2) not null default 0,
  default_overhead_cost numeric(12,2) not null default 0,
  default_packaging_cost numeric(12,2) not null default 0,
  default_loss_percent numeric(5,2) not null default 0,
  default_margin_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_cost numeric(12,2) not null,
  labor_cost numeric(12,2) not null,
  overhead_cost numeric(12,2) not null,
  packaging_cost numeric(12,2) not null,
  loss_percent numeric(5,2) not null,
  margin_percent numeric(5,2) not null,
  suggested_sale_price numeric(12,2) not null,
  expected_profit numeric(12,2) not null,
  snapshot_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists profit_simulations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  sale_price numeric(12,2) not null,
  quantity_sold integer not null,
  unit_cost numeric(12,2) not null,
  gross_revenue numeric(12,2) not null,
  total_cost numeric(12,2) not null,
  estimated_profit numeric(12,2) not null,
  profit_margin_percent numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  currency text not null default 'BRL',
  weight_unit_default text not null default 'g',
  volume_unit_default text not null default 'ml',
  theme_mode text not null default 'light',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into plans (name, price_monthly, recipe_limit, ingredient_limit, has_advanced_history, has_export)
values
  ('free', 0, 30, 120, false, false),
  ('premium', 29.90, null, null, true, true)
on conflict (name) do nothing;

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table ingredients enable row level security;
alter table ingredient_price_history enable row level security;
alter table recipes enable row level security;
alter table recipe_items enable row level security;
alter table pricing_rules enable row level security;
alter table pricing_snapshots enable row level security;
alter table profit_simulations enable row level security;
alter table activity_logs enable row level security;
alter table app_settings enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "subscriptions_own" on subscriptions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "ingredients_own" on ingredients for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "recipes_own" on recipes for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "pricing_rules_own" on pricing_rules for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "pricing_snapshots_own" on pricing_snapshots for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "profit_simulations_own" on profit_simulations for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "activity_logs_own" on activity_logs for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "app_settings_own" on app_settings for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "ingredient_price_history_via_ingredient" on ingredient_price_history for all using (
  exists (select 1 from ingredients i where i.id = ingredient_id and i.profile_id = auth.uid())
) with check (
  exists (select 1 from ingredients i where i.id = ingredient_id and i.profile_id = auth.uid())
);
create policy "recipe_items_via_recipe" on recipe_items for all using (
  exists (select 1 from recipes r where r.id = recipe_id and r.profile_id = auth.uid())
) with check (
  exists (select 1 from recipes r where r.id = recipe_id and r.profile_id = auth.uid())
);
