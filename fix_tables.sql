-- Script para corrigir/adicionar colunas faltantes nas tabelas do webhook

-- Verificar e adicionar colunas faltantes na tabela card_events
DO $$ 
BEGIN
    -- Adicionar coluna occurred_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'card_events' AND column_name = 'occurred_at') THEN
        ALTER TABLE card_events ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'card_events' AND column_name = 'created_at') THEN
        ALTER TABLE card_events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna payload_json se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'card_events' AND column_name = 'payload_json') THEN
        ALTER TABLE card_events ADD COLUMN payload_json JSONB;
    END IF;
END $$;

-- Verificar e adicionar colunas faltantes na tabela card_movements
DO $$ 
BEGIN
    -- Adicionar coluna occurred_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'card_movements' AND column_name = 'occurred_at') THEN
        ALTER TABLE card_movements ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'card_movements' AND column_name = 'created_at') THEN
        ALTER TABLE card_movements ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verificar e adicionar colunas faltantes na tabela lists
DO $$ 
BEGIN
    -- Adicionar coluna pos se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lists' AND column_name = 'pos') THEN
        ALTER TABLE lists ADD COLUMN pos INTEGER;
    END IF;
    
    -- Adicionar coluna closed se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lists' AND column_name = 'closed') THEN
        ALTER TABLE lists ADD COLUMN closed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lists' AND column_name = 'created_at') THEN
        ALTER TABLE lists ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lists' AND column_name = 'updated_at') THEN
        ALTER TABLE lists ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verificar e adicionar colunas faltantes na tabela cards
DO $$ 
BEGIN
    -- Adicionar coluna current_list_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'current_list_id') THEN
        ALTER TABLE cards ADD COLUMN current_list_id TEXT;
    END IF;
    
    -- Adicionar coluna act_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'act_type') THEN
        ALTER TABLE cards ADD COLUMN act_type TEXT;
    END IF;
    
    -- Adicionar coluna act_value se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'act_value') THEN
        ALTER TABLE cards ADD COLUMN act_value DECIMAL(10,2);
    END IF;
    
    -- Adicionar coluna clerk_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'clerk_name') THEN
        ALTER TABLE cards ADD COLUMN clerk_name TEXT;
    END IF;
    
    -- Adicionar coluna reconference se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'reconference') THEN
        ALTER TABLE cards ADD COLUMN reconference BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar coluna is_closed se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'is_closed') THEN
        ALTER TABLE cards ADD COLUMN is_closed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'created_at') THEN
        ALTER TABLE cards ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cards' AND column_name = 'updated_at') THEN
        ALTER TABLE cards ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_card_events_card_id ON card_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_events_occurred_at ON card_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_card_movements_card_id ON card_movements(card_id);
CREATE INDEX IF NOT EXISTS idx_card_movements_occurred_at ON card_movements(occurred_at);
CREATE INDEX IF NOT EXISTS idx_cards_current_list_id ON cards(current_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_act_type ON cards(act_type);

-- Verificar estrutura das tabelas
SELECT 'card_events' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'card_events' 
ORDER BY ordinal_position;

SELECT 'card_movements' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'card_movements' 
ORDER BY ordinal_position;

SELECT 'lists' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lists' 
ORDER BY ordinal_position;

SELECT 'cards' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cards' 
ORDER BY ordinal_position;
