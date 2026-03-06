create table if not exists public.fortnox_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz not null,
  fortnox_company_name text,
  fortnox_org_number text,
  scopes text[] default '{}',
  is_active boolean not null default true,
  auto_sync boolean not null default true,
  sync_from_date date,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fortnox_sync_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.fortnox_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running',
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  sync_started_at timestamptz not null default now(),
  sync_finished_at timestamptz,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.fortnox_sync_items (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.fortnox_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fortnox_given_number text not null,
  fortnox_invoice_number text,
  fortnox_supplier_name text,
  document_id uuid references public.documents(id) on delete set null,
  status text not null default 'processed',
  error_message text,
  synced_at timestamptz not null default now(),
  unique (connection_id, fortnox_given_number)
);

create index if not exists fortnox_sync_logs_user_id_idx
  on public.fortnox_sync_logs(user_id, created_at desc);

create index if not exists fortnox_sync_items_user_id_idx
  on public.fortnox_sync_items(user_id, synced_at desc);

alter table public.fortnox_connections enable row level security;
alter table public.fortnox_sync_logs enable row level security;
alter table public.fortnox_sync_items enable row level security;

create policy "Users manage own fortnox connection"
  on public.fortnox_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own fortnox sync logs"
  on public.fortnox_sync_logs
  for select
  using (auth.uid() = user_id);

create policy "Users read own fortnox sync items"
  on public.fortnox_sync_items
  for select
  using (auth.uid() = user_id);
