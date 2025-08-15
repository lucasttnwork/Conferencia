-- Script para criar as tabelas necessárias para o webhook do Trello

-- Tabela para eventos brutos do Trello
CREATE TABLE IF NOT EXISTS card_events (
  id SERIAL PRIMARY KEY,
  trello_action_id TEXT UNIQUE NOT NULL,
  action_type TEXT NOT NULL,
  raw_action_type TEXT NOT NULL,
  card_id TEXT,
  card_name TEXT,
  board_id TEXT,
  board_name TEXT,
  list_from_id TEXT,
  list_from_name TEXT,
  list_to_id TEXT,
  list_to_name TEXT,
  member_id TEXT,
  member_username TEXT,
  member_fullname TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para movimentações de cards
CREATE TABLE IF NOT EXISTS card_movements (
  id SERIAL PRIMARY KEY,
  trello_action_id TEXT UNIQUE NOT NULL,
  card_id TEXT NOT NULL,
  from_list_id TEXT,
  from_list_name TEXT,
  to_list_id TEXT,
  to_list_name TEXT,
  member_id TEXT,
  member_username TEXT,
  member_fullname TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para listas
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT,
  pos INTEGER,
  closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para cards
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT,
  current_list_id TEXT REFERENCES lists(id),
  act_type TEXT,
  act_value DECIMAL(10,2),
  clerk_name TEXT,
  reconference BOOLEAN DEFAULT FALSE,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_card_events_card_id ON card_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_events_occurred_at ON card_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_movements_card_id ON card_movements(card_id);
CREATE INDEX IF NOT EXISTS idx_card_movements_occurred_at ON card_movements(occurred_at);
CREATE INDEX IF NOT EXISTS idx_cards_current_list_id ON cards(current_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_act_type ON cards(act_type);
