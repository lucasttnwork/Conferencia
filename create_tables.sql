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

-- Tabela de tipos de ato (domínio)
CREATE TABLE IF NOT EXISTS act_type (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Valores padrão de tipos de ato
INSERT INTO act_type(name) VALUES
('Escritura de Venda e Compra'),
('Escritura de Divórcio'),
('Procuração'),
('Escritura de Confissão de Dívida e Promessa de Dação em pagamento'),
('Retificação e Ratificação'),
('Escritura de Pacto Antenupcial'),
('Ata Retificativa'),
('Testamento'),
('Ata Notarial'),
('Escritura de Revogação de Procuração'),
('Diretivas Antecipadas de Vontade'),
('Escritura de Nomeação de inventariante'),
('Escritura de Reconhecimento e Dissolução de União Estável'),
('Escritura de Dissolução de União Estável'),
('Escritura de Renuncia de Herança'),
('Aditamento'),
('Escritura de Renuncia de Usufruto'),
('Escritura de Dação em Pagamento'),
('Ata Notarial para Usucapião'),
('Escritura Pública de União Estável'),
('Rerratificação'),
('Escritura de Inventário'),
('Escritura de Cessão de Direitos'),
('Arrolamento E Partilha'),
('Escritura de Sobrepartilha'),
('Escritura Pública de Instituição Amigável de Servidão Administrativa a Título Gratuito'),
('Escritura de alienação fiduciária'),
('Substabelecimento'),
('Escritura de Doação'),
('Escritura de Emancipação'),
('Escritura de Abertura de Crédito Rotativo com Garantia Hipotecária'),
('Escritura de Inventário e Adjudicação'),
('Escritura de Inventário e Partilha'),
('Escritura de Divisão amigável'),
('Cancelamento de Cláusulas'),
('Escritura de Declaração de Namoro'),
('Escritura de Constituição de Servidão Perpétua e Gratuita de Passagem')
ON CONFLICT (name) DO NOTHING;

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

-- Sincronizar quaisquer tipos existentes em cards.act_type para a tabela de domínio
INSERT INTO act_type(name)
SELECT DISTINCT act_type FROM cards WHERE act_type IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Tornar cards.act_type uma FK para act_type(name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cards_act_type_fkey' AND conrelid = 'cards'::regclass
  ) THEN
    ALTER TABLE cards
      ADD CONSTRAINT cards_act_type_fkey
      FOREIGN KEY (act_type) REFERENCES act_type(name)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_card_events_card_id ON card_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_events_occurred_at ON card_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_movements_card_id ON card_movements(card_id);
CREATE INDEX IF NOT EXISTS idx_card_movements_occurred_at ON card_movements(occurred_at);
CREATE INDEX IF NOT EXISTS idx_cards_current_list_id ON cards(current_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_act_type ON cards(act_type);
