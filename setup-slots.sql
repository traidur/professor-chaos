-- Professor Chaos Platform — run this entire file in your new Supabase project's SQL Editor

-- ── SLOT REGISTRY ─────────────────────────────────────────────────────────────

create table public.slot_registry (
  slot_name    text primary key,
  is_available boolean default true,
  app_id       uuid,
  app_name     text,
  github_repo  text,
  live_url     text,
  claimed_at   timestamptz,
  config       jsonb
);

alter table public.slot_registry enable row level security;
create policy "read_open"      on public.slot_registry for select using (true);
create policy "no_direct_write" on public.slot_registry for insert with check (false);
create policy "no_direct_update" on public.slot_registry for update using (false);
create policy "no_direct_delete" on public.slot_registry for delete using (false);

-- ── CLAIM SLOT RPC ────────────────────────────────────────────────────────────
-- Atomically assigns the next available slot. Safe under concurrent requests.

create or replace function public.claim_slot(p_app_name text, p_config jsonb default '{}')
returns table(slot_name text, app_id uuid)
language plpgsql security definer as $$
declare
  v_slot   text;
  v_app_id uuid;
begin
  select sr.slot_name into v_slot
  from public.slot_registry sr
  where sr.is_available = true
  order by sr.slot_name
  for update skip locked
  limit 1;

  if v_slot is null then
    raise exception 'No slots available. Contact the Professor.';
  end if;

  v_app_id := gen_random_uuid();

  update public.slot_registry set
    is_available = false,
    app_id       = v_app_id,
    app_name     = p_app_name,
    config       = p_config,
    claimed_at   = now()
  where slot_registry.slot_name = v_slot;

  return query select v_slot, v_app_id;
end;
$$;

-- ── RELEASE SLOT RPC ──────────────────────────────────────────────────────────
-- Wipes all data in a slot's schema and marks it available again.

create or replace function public.release_slot(p_slot_name text)
returns void
language plpgsql security definer as $$
begin
  execute format(
    'truncate %I.ballot_options, %I.votes, %I.visits, %I.ballots, %I.items, %I.settings restart identity cascade',
    p_slot_name, p_slot_name, p_slot_name, p_slot_name, p_slot_name, p_slot_name
  );

  update public.slot_registry set
    is_available = true,
    app_id       = null,
    app_name     = null,
    github_repo  = null,
    live_url     = null,
    claimed_at   = null,
    config       = null
  where slot_name = p_slot_name;
end;
$$;

-- ── UPDATE SLOT URLS RPC ──────────────────────────────────────────────────────
-- Called by the generator after GitHub repo/Pages are created.

create or replace function public.update_slot_urls(p_slot_name text, p_github_repo text, p_live_url text)
returns void
language plpgsql security definer as $$
begin
  update public.slot_registry set
    github_repo = p_github_repo,
    live_url    = p_live_url
  where slot_name = p_slot_name;
end;
$$;

-- ── SLOT SCHEMAS (slot01–slot20) ──────────────────────────────────────────────

do $$
declare
  i   int;
  s   text;
  tbl text;
begin
  for i in 1..20 loop
    s := 'slot' || lpad(i::text, 2, '0');

    execute format('create schema if not exists %I', s);

    execute format('
      create table %I.items (
        id           uuid default gen_random_uuid() primary key,
        name         text not null,
        field2       text,
        submitted_by text,
        created_at   timestamptz default now(),
        is_active    boolean default true,
        image_seed   int,
        image_url    text
      )', s);

    execute format('
      create table %I.ballots (
        id         uuid default gen_random_uuid() primary key,
        week_of    date not null,
        created_at timestamptz default now(),
        closed     boolean default false,
        winner_id  uuid references %I.items(id),
        title      text
      )', s, s);

    execute format('
      create table %I.ballot_options (
        id        uuid default gen_random_uuid() primary key,
        ballot_id uuid references %I.ballots(id) on delete cascade,
        item_id   uuid references %I.items(id)
      )', s, s, s);

    execute format('
      create table %I.votes (
        id          uuid default gen_random_uuid() primary key,
        ballot_id   uuid references %I.ballots(id) on delete cascade,
        item_id     uuid references %I.items(id),
        voter_name  text not null,
        device_id   text not null,
        voted_at    timestamptz default now(),
        unique(ballot_id, device_id)
      )', s, s, s);

    execute format('
      create table %I.visits (
        id         uuid default gen_random_uuid() primary key,
        item_id    uuid references %I.items(id),
        visited_on date not null,
        created_at timestamptz default now()
      )', s, s);

    execute format('
      create table %I.settings (
        key   text primary key,
        value text
      )', s);

    foreach tbl in array array['items','ballots','ballot_options','votes','visits','settings'] loop
      execute format('alter table %I.%I enable row level security', s, tbl);
      execute format('create policy "public_all" on %I.%I for all using (true) with check (true)', s, tbl);
    end loop;

  end loop;
end;
$$;

-- ── PRE-POPULATE REGISTRY ─────────────────────────────────────────────────────

insert into public.slot_registry (slot_name) values
  ('slot01'),('slot02'),('slot03'),('slot04'),('slot05'),
  ('slot06'),('slot07'),('slot08'),('slot09'),('slot10'),
  ('slot11'),('slot12'),('slot13'),('slot14'),('slot15'),
  ('slot16'),('slot17'),('slot18'),('slot19'),('slot20');

-- ── DONE ──────────────────────────────────────────────────────────────────────
-- ── GRANT SCHEMA PERMISSIONS ─────────────────────────────────────────────────

do $$
declare
  i int;
  s text;
begin
  for i in 1..20 loop
    s := 'slot' || lpad(i::text, 2, '0');
    execute format('grant usage on schema %I to anon, authenticated', s);
    execute format('grant all on all tables in schema %I to anon, authenticated', s);
  end loop;
end;
$$;

-- After running this file:
-- 1. Go to Supabase dashboard → Data API → Settings → Exposed schemas
-- 2. Add: slot01, slot02, ... slot20  (all 20)
-- 3. Save. Now the JS client can use db.schema('slot01').from('items') etc.
