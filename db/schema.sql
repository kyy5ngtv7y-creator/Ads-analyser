-- Ads-Analyser — Postgres-Schema für Phase 2 (Supabase).
-- Ersetzt die localStorage-Schicht aus src/lib/store.ts.
-- Anwenden: Supabase SQL Editor oder `supabase db push`.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  product_description text not null,
  offer_type text not null check (offer_type in ('service', 'product', 'dropshipping')),
  price_tier text not null check (price_tier in ('budget', 'mid', 'premium')),
  created_at timestamptz not null default now()
);

create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  name text not null,
  demographics text not null default '',
  pains jsonb not null default '[]',
  desires jsonb not null default '[]',
  objections jsonb not null default '[]',
  awareness_level text not null default 'problem-aware',
  tone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  persona_id uuid references personas (id) on delete set null,
  angle_id uuid,
  format text not null check (format in ('image', 'video')),
  platforms text[] not null,
  goal text not null check (goal in ('sales', 'leads', 'brand')),
  primary_metric text not null check (primary_metric in ('impressions', 'sales', 'add_to_cart', 'checkout', 'awareness')),
  funnel_stage text not null check (funnel_stage in ('cold', 'retargeting', 'customers')),
  offer_type text not null,
  price_tier text not null,
  headline text not null default '',
  primary_text text not null default '',
  cta text not null default '',
  creative_path text, -- Supabase-Storage-Pfad
  video_duration_sec numeric,
  created_at timestamptz not null default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('meta', 'tiktok')),
  total_score int not null check (total_score between 0 and 100),
  verdict text not null check (verdict in ('winner', 'solid', 'risky', 'flop')),
  criteria jsonb not null,          -- [{key, score, weight, reasoning}]
  applied_caps jsonb not null default '[]',
  summary text not null default '',
  platform_advice text not null default '',
  improvements jsonb not null default '[]',
  rewrites jsonb not null default '[]',
  framework_version text not null,
  model_version text,
  engine text not null default 'claude',
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create table if not exists angle_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  context jsonb not null,
  angles jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'trial' check (plan in ('trial', 'standard', 'pro')),
  status text not null default 'trialing',
  trial_started_at timestamptz not null default now(),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null,               -- +Kontingent (Abo-Erneuerung) / -1 pro Analyse
  reason text not null,             -- 'subscription_renewal' | 'analysis' | 'adjustment'
  analysis_id uuid references analyses (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Phase 6: echte Performance-Daten zur Kalibrierung
create table if not exists ad_results (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  spend numeric,
  impressions bigint,
  clicks bigint,
  add_to_carts bigint,
  purchases bigint,
  revenue numeric,
  reported_at timestamptz not null default now()
);

-- RLS: Jeder sieht nur seine eigenen Daten.
alter table profiles enable row level security;
alter table projects enable row level security;
alter table personas enable row level security;
alter table ads enable row level security;
alter table analyses enable row level security;
alter table angle_sets enable row level security;
alter table subscriptions enable row level security;
alter table credit_ledger enable row level security;
alter table ad_results enable row level security;

do $$
declare t text;
begin
  foreach t in array array['projects','personas','ads','analyses','angle_sets','subscriptions','credit_ledger','ad_results'] loop
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
  create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
end $$;
