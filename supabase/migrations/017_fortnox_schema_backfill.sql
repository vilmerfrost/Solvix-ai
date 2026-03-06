alter table if exists public.fortnox_connections
  add column if not exists encrypted_access_token text,
  add column if not exists encrypted_refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists fortnox_company_name text,
  add column if not exists fortnox_org_number text,
  add column if not exists scopes text[] default '{}',
  add column if not exists is_active boolean not null default true,
  add column if not exists auto_sync boolean not null default true,
  add column if not exists sync_from_date date,
  add column if not exists last_sync_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.fortnox_sync_logs
  add column if not exists imported_count integer not null default 0,
  add column if not exists skipped_count integer not null default 0,
  add column if not exists failed_count integer not null default 0,
  add column if not exists sync_started_at timestamptz not null default now(),
  add column if not exists sync_finished_at timestamptz,
  add column if not exists message text,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.fortnox_sync_items
  add column if not exists fortnox_invoice_number text,
  add column if not exists fortnox_supplier_name text,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists status text not null default 'processed',
  add column if not exists error_message text,
  add column if not exists synced_at timestamptz not null default now();

create index if not exists fortnox_sync_logs_user_id_idx
  on public.fortnox_sync_logs(user_id, created_at desc);

create index if not exists fortnox_sync_items_user_id_idx
  on public.fortnox_sync_items(user_id, synced_at desc);
