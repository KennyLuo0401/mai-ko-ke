-- 《麥擱假》 S1.5 — schema, constraints and row level security
-- BUILD_PLAN §8 (minimum data model), §13 (security), §21 (constraints)
--
-- Threat model / 威脅模型
-- The browser never talks to Postgres for game data: every read and write goes
-- through a server Route Handler holding the secret key. So RLS here is the
-- second line of defence — if the publishable key leaked, it must still expose
-- nothing private. Every table denies anon and authenticated by default; the
-- only exception is four non-secret columns of `rooms`, which Realtime needs so
-- a client can learn "something changed" and then re-fetch its authorized
-- RoomView from our API.
--
-- 瀏覽器不直接讀寫遊戲資料；RLS 是第二道防線，預設全部拒絕。

begin;

-- ---------------------------------------------------------------------------
-- Enum-like domains are expressed as checks so the values stay readable in SQL
-- and match lib/contracts/index.ts exactly.
-- ---------------------------------------------------------------------------

create table if not exists public.rooms (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (code ~ '^[0-9]{6}$'),
  host_user_id      text not null,
  language          text not null check (language in ('zh-TW', 'en')),
  state             text not null default 'LOBBY' check (state in (
                      'LOBBY','MATERIAL_SUBMITTED','BRIEFING_READY','INITIAL_VOTE',
                      'PRIVATE_CARD','READY_TO_REVEAL','REVEALED',
                      'IN_PERSON_DISCUSSION','FINAL_VOTE','CONSENSUS_REVIEW','COMPLETED')),
  -- Monotonic. Doubles as the optimistic-concurrency token: every mutation is a
  -- compare-and-swap on this value, which is what makes reveal fire exactly once.
  version           bigint not null default 1,
  processing_kind   text check (processing_kind in ('analysis','consensus')),
  processing_status text check (processing_status in ('pending','failed')),
  processing_code   text,
  published_map     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  -- Our own anonymous identity from a signed httpOnly cookie, never client-supplied.
  user_id    text not null,
  nickname   text not null check (char_length(nickname) between 1 and 24),
  language   text not null check (language in ('zh-TW', 'en')),
  active     boolean not null default true,
  -- Frozen roster: set when the initial vote opens. These players must finish
  -- every stage before the game advances.
  required   boolean not null default false,
  -- One card per player per room (§8 "assignments"), kept here rather than in a
  -- separate table: `players` is already unique per (room, user), so the
  -- "one assignment per player per room" constraint is structural.
  card_id    text,
  joined_at  timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.materials (
  room_id       uuid primary key references public.rooms(id) on delete cascade,
  source_text   text not null,
  host_question text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.game_packages (
  room_id        uuid primary key references public.rooms(id) on delete cascade,
  schema_version text  not null,
  briefing       jsonb not null,
  claims         jsonb not null,
  cards          jsonb not null,
  reasons        jsonb not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  stage      text not null check (stage in ('initial','card','final')),
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  -- One answer per player per stage; answers freeze once submitted (§21).
  unique (player_id, stage)
);

create table if not exists public.consensus_statements (
  room_id  uuid not null references public.rooms(id) on delete cascade,
  id       text not null,
  text     jsonb not null,
  category text not null check (category in (
             'candidate_agreement','disagreement','missing_evidence','uncertainty')),
  position integer not null,
  primary key (room_id, id)
);

create table if not exists public.consensus_votes (
  room_id      uuid not null references public.rooms(id) on delete cascade,
  statement_id text not null,
  player_id    uuid not null references public.players(id) on delete cascade,
  decision     text not null check (decision in ('agree','needs_revision','disagree')),
  updated_at   timestamptz not null default now(),
  -- One vote per player per statement (§21).
  primary key (room_id, statement_id, player_id)
);

create index if not exists players_room_idx    on public.players (room_id, joined_at);
create index if not exists responses_room_idx  on public.responses (room_id, stage);
create index if not exists votes_room_idx      on public.consensus_votes (room_id, statement_id);

-- ---------------------------------------------------------------------------
-- Row level security. Deny by default, everywhere.
-- ---------------------------------------------------------------------------

alter table public.rooms                enable row level security;
alter table public.players              enable row level security;
alter table public.materials            enable row level security;
alter table public.game_packages        enable row level security;
alter table public.responses            enable row level security;
alter table public.consensus_statements enable row level security;
alter table public.consensus_votes      enable row level security;

-- Supabase grants table privileges to anon/authenticated by default, so revoke
-- them explicitly. RLS alone would still be blocked, but defence in depth means
-- the grant should not be there either.
revoke all on public.rooms,
              public.players,
              public.materials,
              public.game_packages,
              public.responses,
              public.consensus_statements,
              public.consensus_votes
  from anon, authenticated;

-- The single deliberate exception: Realtime needs to read room state changes.
-- Column-level grants mean host_user_id and the published map stay unreadable
-- even though the row is selectable.
grant select (id, code, state, version) on public.rooms to anon, authenticated;

drop policy if exists "room state is public" on public.rooms;
create policy "room state is public"
  on public.rooms for select
  to anon, authenticated
  using (true);

-- No policies exist for the other six tables, so anon and authenticated are
-- denied every action on them. The server's secret key bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- Realtime: publish room-state changes only.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;

commit;
