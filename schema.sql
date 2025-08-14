-- EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- BOARDS
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  trello_id text not null unique,
  name text not null,
  url text,
  created_at timestamptz not null default now()
);

-- MEMBERS (para uso futuro: criador/movimentações)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  trello_id text not null unique,
  username text not null,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- LISTS (colunas do board)
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  trello_id text not null unique,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  pos numeric,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_lists_board on public.lists(board_id);
create index if not exists idx_lists_trello on public.lists(trello_id);

-- LABELS (etiquetas, opcional agora)
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  trello_id text not null unique,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists idx_labels_board on public.labels(board_id);

-- CARDS (inclui campos parseados da descrição padrão)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  trello_id text not null unique,
  board_id uuid not null references public.boards(id) on delete cascade,
  current_list_id uuid references public.lists(id),
  current_list_trello_id text,             -- preenchido na indexação por ID
  name text,                                -- preenchido no enrich
  description text,                         -- preenchido no enrich
  url text,
  protocol_number text,                     -- extraído do name (sequência 6+ dígitos)
  is_closed boolean not null default false,
  due_at timestamptz,

  -- Campos da descrição padronizada do card (todos opcionais)
  received_at timestamptz,                  -- 📆 Recebido em
  received_at_text text,                    -- valor cru
  clerk_name text,                          -- 👤 Escrevente
  act_type text,                            -- 💼 Natureza
  act_value numeric(14,2),                  -- 💰 Valor (BRL)
  act_value_text text,                      -- valor cru
  clerk_email text,                         -- 📧 E-mail
  reconference boolean,                     -- Reconferência: sim/nao

  created_by_member_id uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz

  -- Removendo constraint única de protocol_number pois pode haver duplicatas
);
create index if not exists idx_cards_board on public.cards(board_id);
create index if not exists idx_cards_list on public.cards(current_list_id);
create index if not exists idx_cards_list_trello on public.cards(current_list_trello_id);
create index if not exists idx_cards_protocol on public.cards(protocol_number);

-- N:N (uso futuro)
create table if not exists public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists public.card_members (
  card_id uuid not null references public.cards(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (card_id, member_id)
);

-- Histórico de movimentações (para dashboard de produtividade, futuro)
create table if not exists public.card_movements (
  id bigserial primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  from_list_id uuid references public.lists(id),
  to_list_id uuid references public.lists(id),
  moved_by_member_id uuid references public.members(id),
  moved_at timestamptz not null,
  trello_action_id text unique
);
create index if not exists idx_movements_card on public.card_movements(card_id);
create index if not exists idx_movements_member on public.card_movements(moved_by_member_id);
create index if not exists idx_movements_time on public.card_movements(moved_at);

-- Raw webhook (auditoria / reprocesso)
create table if not exists public.webhook_events (
  id bigserial primary key,
  board_id uuid references public.boards(id),
  trello_action_id text,
  action_type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- RPC opcional para resolver current_list_id a partir de current_list_trello_id
create or replace function public.backfill_card_list_id(p_board_id uuid)
returns void
language sql
as $$
  update public.cards c
     set current_list_id = l.id
  from public.lists l
  where c.board_id = p_board_id
    and c.current_list_id is null
    and c.current_list_trello_id = l.trello_id;
$$; 