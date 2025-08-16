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

-- Garantir colunas de movimentação de listas (evita PGRST204)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card_movements' AND column_name = 'from_list_id'
    ) THEN
        ALTER TABLE card_movements ADD COLUMN from_list_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card_movements' AND column_name = 'from_list_name'
    ) THEN
        ALTER TABLE card_movements ADD COLUMN from_list_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card_movements' AND column_name = 'to_list_id'
    ) THEN
        ALTER TABLE card_movements ADD COLUMN to_list_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card_movements' AND column_name = 'to_list_name'
    ) THEN
        ALTER TABLE card_movements ADD COLUMN to_list_name TEXT;
    END IF;
END $$;

-- Remover views do dashboard que dependem de colunas que serão alteradas
DROP VIEW IF EXISTS public.dashboard_stats;
DROP VIEW IF EXISTS public.dashboard_lists;
DROP VIEW IF EXISTS public.dashboard_total_cards;
DROP VIEW IF EXISTS public.dashboard_act_types;
DROP VIEW IF EXISTS public.dashboard_list_breakdown;
DROP VIEW IF EXISTS public.dashboard_list_pivot;
DROP VIEW IF EXISTS public.dashboard_list_summary;

-- Converter IDs para TEXT se houverem sido criados como UUID (evita 22P02)
-- Remover FKs que referenciam lists.id antes de alterar tipos
ALTER TABLE IF EXISTS card_movements DROP CONSTRAINT IF EXISTS card_movements_from_list_id_fkey;
ALTER TABLE IF EXISTS card_movements DROP CONSTRAINT IF EXISTS card_movements_to_list_id_fkey;
ALTER TABLE IF EXISTS cards DROP CONSTRAINT IF EXISTS cards_current_list_id_fkey;

DO $$
DECLARE
    lists_id_is_uuid BOOLEAN;
    cards_id_is_uuid BOOLEAN;
    cards_current_list_is_uuid BOOLEAN;
    cm_from_is_uuid BOOLEAN;
    cm_to_is_uuid BOOLEAN;
BEGIN
    SELECT CASE WHEN data_type = 'uuid' THEN TRUE ELSE FALSE END
    INTO lists_id_is_uuid
    FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'id';

    SELECT CASE WHEN data_type = 'uuid' THEN TRUE ELSE FALSE END
    INTO cards_id_is_uuid
    FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'id';

    SELECT CASE WHEN data_type = 'uuid' THEN TRUE ELSE FALSE END
    INTO cards_current_list_is_uuid
    FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'current_list_id';

    SELECT CASE WHEN data_type = 'uuid' THEN TRUE ELSE FALSE END
    INTO cm_from_is_uuid
    FROM information_schema.columns
    WHERE table_name = 'card_movements' AND column_name = 'from_list_id';

    SELECT CASE WHEN data_type = 'uuid' THEN TRUE ELSE FALSE END
    INTO cm_to_is_uuid
    FROM information_schema.columns
    WHERE table_name = 'card_movements' AND column_name = 'to_list_id';

    -- Ajustar chave estrangeira antes da mudança de tipo
    IF lists_id_is_uuid OR cards_current_list_is_uuid THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'cards' 
              AND tc.constraint_type = 'FOREIGN KEY' 
              AND tc.constraint_name = 'cards_current_list_id_fkey'
        ) THEN
            ALTER TABLE cards DROP CONSTRAINT cards_current_list_id_fkey;
        END IF;
    END IF;

    -- Alterar tipos para TEXT conforme necessário
    IF lists_id_is_uuid THEN
        ALTER TABLE lists ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    IF cards_id_is_uuid THEN
        ALTER TABLE cards ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    IF cards_current_list_is_uuid THEN
        ALTER TABLE cards ALTER COLUMN current_list_id TYPE TEXT USING current_list_id::text;
    END IF;

    IF cm_from_is_uuid THEN
        ALTER TABLE card_movements ALTER COLUMN from_list_id TYPE TEXT USING from_list_id::text;
    END IF;

    IF cm_to_is_uuid THEN
        ALTER TABLE card_movements ALTER COLUMN to_list_id TYPE TEXT USING to_list_id::text;
    END IF;

    -- Recriar a FK para refletir os novos tipos (ambos TEXT)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'cards' 
          AND tc.constraint_type = 'FOREIGN KEY' 
          AND tc.constraint_name = 'cards_current_list_id_fkey'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'current_list_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'lists' AND column_name = 'id'
        ) THEN
            ALTER TABLE cards 
            ADD CONSTRAINT cards_current_list_id_fkey 
            FOREIGN KEY (current_list_id) REFERENCES lists(id);
        END IF;
    END IF;

    -- Recriar FKs de card_movements -> lists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'card_movements' 
          AND tc.constraint_type = 'FOREIGN KEY' 
          AND tc.constraint_name = 'card_movements_from_list_id_fkey'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'card_movements' AND column_name = 'from_list_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'lists' AND column_name = 'id'
        ) THEN
            ALTER TABLE card_movements 
            ADD CONSTRAINT card_movements_from_list_id_fkey 
            FOREIGN KEY (from_list_id) REFERENCES lists(id);
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'card_movements' 
          AND tc.constraint_type = 'FOREIGN KEY' 
          AND tc.constraint_name = 'card_movements_to_list_id_fkey'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'card_movements' AND column_name = 'to_list_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'lists' AND column_name = 'id'
        ) THEN
            ALTER TABLE card_movements 
            ADD CONSTRAINT card_movements_to_list_id_fkey 
            FOREIGN KEY (to_list_id) REFERENCES lists(id);
        END IF;
    END IF;
END $$;

-- Recriar views do dashboard após alterações de tipo
-- View para Dashboard de Cards
-- Esta view fornece todas as informações necessárias para o dashboard em tempo real
CREATE OR REPLACE VIEW dashboard_stats AS
WITH list_stats AS (
  SELECT 
    l.id as list_id,
    l.name as list_name,
    l.pos as list_position,
    COUNT(c.id) as total_cards,
    COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
    COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as cards_without_act_type
  FROM public.lists l
  LEFT JOIN public.cards c ON l.id = c.current_list_id
  WHERE l.closed = false
  GROUP BY l.id, l.name, l.pos
),
act_type_stats AS (
  SELECT 
    COALESCE(act_type, 'Não definido') as act_type_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN c.current_list_id IS NOT NULL THEN 1 END) as active_cards,
    SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
  FROM public.cards c
  GROUP BY act_type
),
list_act_type_breakdown AS (
  SELECT 
    l.id as list_id,
    l.name as list_name,
    l.pos as list_position,
    COALESCE(c.act_type, 'Não definido') as act_type_name,
    COUNT(*) as cards_count,
    SUM(CASE WHEN c.act_value IS NOT NULL THEN c.act_value ELSE 0 END) as total_value
  FROM public.lists l
  LEFT JOIN public.cards c ON l.id = c.current_list_id
  WHERE l.closed = false
  GROUP BY l.id, l.name, l.pos, c.act_type
),
overall_stats AS (
  SELECT 
    COUNT(*) as total_cards,
    COUNT(CASE WHEN act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
    COUNT(CASE WHEN act_type IS NULL THEN 1 END) as cards_without_act_type,
    COUNT(CASE WHEN clerk_name IS NOT NULL THEN 1 END) as cards_with_clerk,
    COUNT(CASE WHEN act_value IS NOT NULL THEN 1 END) as cards_with_value,
    SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value,
    COUNT(CASE WHEN reconference = true THEN 1 END) as cards_needing_reconference
  FROM public.cards
)
SELECT 
  'list_summary' as data_type,
  json_build_object(
    'lists', (
      SELECT json_agg(
        json_build_object(
          'id', ls.list_id,
          'name', ls.list_name,
          'position', ls.list_position,
          'total_cards', ls.total_cards,
          'cards_with_act_type', ls.cards_with_act_type,
          'cards_without_act_type', ls.cards_without_act_type
        ) ORDER BY ls.list_position
      )
      FROM list_stats ls
    )
  ) as data
UNION ALL
SELECT 
  'act_type_summary' as data_type,
  json_build_object(
    'act_types', (
      SELECT json_agg(
        json_build_object(
          'name', ats.act_type_name,
          'total_count', ats.total_count,
          'active_cards', ats.active_cards,
          'total_value', ats.total_value
        ) ORDER BY ats.total_count DESC
      )
      FROM act_type_stats ats
    )
  ) as data
UNION ALL
SELECT 
  'list_act_type_breakdown' as data_type,
  json_build_object(
    'breakdown', (
      SELECT json_agg(
        json_build_object(
          'list_id', latb.list_id,
          'list_name', latb.list_name,
          'list_position', latb.list_position,
          'act_type_name', latb.act_type_name,
          'cards_count', latb.cards_count,
          'total_value', latb.total_value
        ) ORDER BY latb.list_position, latb.cards_count DESC
      )
      FROM list_act_type_breakdown latb
    )
  ) as data
UNION ALL
SELECT 
  'overall_summary' as data_type,
  json_build_object(
    'overall', (
      SELECT json_build_object(
        'total_cards', os.total_cards,
        'cards_with_act_type', os.cards_with_act_type,
        'cards_without_act_type', os.cards_without_act_type,
        'cards_with_clerk', os.cards_with_clerk,
        'cards_with_value', os.cards_with_value,
        'total_value', os.total_value,
        'cards_needing_reconference', os.cards_needing_reconference
      )
      FROM overall_stats os
    )
  ) as data;

-- View simplificada para consultas diretas (CORRIGIDA)
CREATE OR REPLACE VIEW dashboard_lists AS
WITH list_stats AS (
  SELECT 
    l.id,
    l.name,
    l.pos as position,
    COUNT(c.id) as total_cards,
    COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
    COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as cards_without_act_type
  FROM public.lists l
  LEFT JOIN public.cards c ON l.id = c.current_list_id
  WHERE l.closed = false
  GROUP BY l.id, l.name, l.pos
),
orphaned_cards AS (
  SELECT 
    'Cards sem lista' as name,
    999999 as position,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
    COUNT(CASE WHEN act_type IS NULL THEN 1 END) as cards_without_act_type
  FROM public.cards c
  WHERE c.current_list_id IS NULL
)
SELECT * FROM list_stats
UNION ALL
SELECT 
  gen_random_uuid() as id,
  name,
  position,
  total_cards,
  cards_with_act_type,
  cards_without_act_type
FROM orphaned_cards
ORDER BY position;

-- NOVA VIEW: Contagem total correta de todos os cards
CREATE OR REPLACE VIEW dashboard_total_cards AS
SELECT 
  COUNT(*) as total_cards,
  COUNT(CASE WHEN act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
  COUNT(CASE WHEN act_type IS NULL THEN 1 END) as cards_without_act_type,
  COUNT(CASE WHEN clerk_name IS NOT NULL THEN 1 END) as cards_with_clerk,
  COUNT(CASE WHEN act_value IS NOT NULL THEN 1 END) as cards_with_value,
  SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value,
  COUNT(CASE WHEN reconference = true THEN 1 END) as cards_needing_reconference
FROM public.cards;

-- View para tipos de ato
CREATE OR REPLACE VIEW dashboard_act_types AS
SELECT 
  COALESCE(act_type, 'Não definido') as name,
  COUNT(*) as total_count,
  SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
FROM public.cards
GROUP BY act_type
ORDER BY total_count DESC;

-- View corrigida: Breakdown por lista e tipo de ato (formato pivot)
CREATE OR REPLACE VIEW dashboard_list_breakdown AS
WITH list_act_counts AS (
  SELECT 
    l.id AS list_id,
    l.name AS list_name,
    l.pos AS list_position,
    COALESCE(c.act_type, 'Não definido') AS act_type_name,
    COUNT(*) AS cards_count,
    SUM(CASE WHEN c.act_value IS NOT NULL THEN c.act_value ELSE 0 END) AS total_value
  FROM public.lists l
  LEFT JOIN public.cards c ON l.id = c.current_list_id
  WHERE l.closed = false
  GROUP BY l.id, l.name, l.pos, c.act_type
),
list_summary AS (
  SELECT 
    list_id,
    list_name,
    list_position,
    SUM(cards_count) AS total_cards_in_list,
    COUNT(CASE WHEN act_type_name != 'Não definido' THEN 1 END) AS unique_act_types,
    SUM(CASE WHEN act_type_name != 'Não definido' THEN cards_count ELSE 0 END) AS classified_cards,
    SUM(CASE WHEN act_type_name = 'Não definido' THEN cards_count ELSE 0 END) AS unclassified_cards
  FROM list_act_counts
  GROUP BY list_id, list_name, list_position
)
SELECT 
  ls.list_id,
  ls.list_name,
  ls.list_position,
  ls.total_cards_in_list,
  ls.unique_act_types,
  ls.classified_cards,
  ls.unclassified_cards,
  CASE 
    WHEN ls.total_cards_in_list = 0 THEN 0
    ELSE ROUND((ls.classified_cards::numeric / ls.total_cards_in_list) * 100, 1)
  END AS completion_percentage,
  lac.act_type_name,
  lac.cards_count,
  lac.total_value
FROM list_summary ls
LEFT JOIN list_act_counts lac ON ls.list_id = lac.list_id
ORDER BY ls.list_position, lac.cards_count DESC;

-- NOVA VIEW: Tabela pivot com uma linha por lista e colunas para tipos de ato
CREATE OR REPLACE VIEW dashboard_list_pivot AS
SELECT 
  l.name as list_name,
  l.pos as list_position,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.act_type = 'Escritura de Venda e Compra' THEN 1 END) as "Escritura de Venda e Compra",
  COUNT(CASE WHEN c.act_type = 'Procuração' THEN 1 END) as "Procuração",
  COUNT(CASE WHEN c.act_type = 'Escritura Pública de Inventário e Partilha' THEN 1 END) as "Escritura Pública de Inventário e Partilha",
  COUNT(CASE WHEN c.act_type = 'Escritura de Doação' THEN 1 END) as "Escritura de Doação",
  COUNT(CASE WHEN c.act_type = 'Ata Notarial para Usucapião' THEN 1 END) as "Ata Notarial para Usucapião",
  COUNT(CASE WHEN c.act_type = 'Escritura de Procuração' THEN 1 END) as "Escritura de Procuração",
  COUNT(CASE WHEN c.act_type = 'Escritura de Sobrepartilha' THEN 1 END) as "Escritura de Sobrepartilha",
  COUNT(CASE WHEN c.act_type = 'Escritura de Divórcio' THEN 1 END) as "Escritura de Divórcio",
  COUNT(CASE WHEN c.act_type = 'Testamento' THEN 1 END) as "Testamento",
  COUNT(CASE WHEN c.act_type = 'Retificação e Ratificação' THEN 1 END) as "Retificação e Ratificação",
  COUNT(CASE WHEN c.act_type = 'Escritura de Nomeação de inventariante' THEN 1 END) as "Escritura de Nomeação de inventariante",
  COUNT(CASE WHEN c.act_type = 'Escritura de Inventário e Partilha' THEN 1 END) as "Escritura de Inventário e Partilha",
  COUNT(CASE WHEN c.act_type = 'Escritura de Confissão de Dívida / Novação e Promessa de Dação em Pagamento' THEN 1 END) as "Escritura de Confissão de Dívida",
  COUNT(CASE WHEN c.act_type = 'Escritura de Dação em pagamento' THEN 1 END) as "Escritura de Dação em pagamento",
  COUNT(CASE WHEN c.act_type = 'Declaração de União Estável' THEN 1 END) as "Declaração de União Estável",
  COUNT(CASE WHEN c.act_type = 'Escritura de Compra e Venda' THEN 1 END) as "Escritura de Compra e Venda",
  COUNT(CASE WHEN c.act_type = 'Escritura de Divórcio Direto' THEN 1 END) as "Escritura de Divórcio Direto",
  COUNT(CASE WHEN c.act_type = 'Escritura Pública de Inventário e Partilha de Bens' THEN 1 END) as "Escritura Pública de Inventário e Partilha de Bens",
  COUNT(CASE WHEN c.act_type = 'Ata de Retificativa' THEN 1 END) as "Ata de Retificativa",
  COUNT(CASE WHEN c.act_type = 'Escritura de Inventário' THEN 1 END) as "Escritura de Inventário",
  COUNT(CASE WHEN c.act_type = 'Escritura de Venda e Compra com alienação fiduciária em garantia' THEN 1 END) as "Escritura de Venda e Compra com alienação fiduciária",
  COUNT(CASE WHEN c.act_type = 'Escritura Pública de Inventário e Adjudicação' THEN 1 END) as "Escritura Pública de Inventário e Adjudicação",
  COUNT(CASE WHEN c.act_type = 'Escritura de Permuta' THEN 1 END) as "Escritura de Permuta",
  COUNT(CASE WHEN c.act_type = 'Escritura de Venda e Compra com cláusula resolutiva' THEN 1 END) as "Escritura de Venda e Compra com cláusula resolutiva",
  COUNT(CASE WHEN c.act_type = 'Escritura Pública de Cessão de Direitos Creditórios' THEN 1 END) as "Escritura Pública de Cessão de Direitos Creditórios",
  COUNT(CASE WHEN c.act_type = 'Revogação de Procuração' THEN 1 END) as "Revogação de Procuração",
  COUNT(CASE WHEN c.act_type = 'Escritura de procuração' THEN 1 END) as "Escritura de procuração",
  COUNT(CASE WHEN c.act_type = 'Escritura Pública de Confissão de Dívida com Promessa de Dação em pagamento' THEN 1 END) as "Escritura Pública de Confissão de Dívida",
  COUNT(CASE WHEN c.act_type = 'Escritura de Doação com Reserva de Usufruto' THEN 1 END) as "Escritura de Doação com Reserva de Usufruto",
  COUNT(CASE WHEN c.act_type = 'Ata Notarial' THEN 1 END) as "Ata Notarial",
  COUNT(CASE WHEN c.act_type = 'Ata Retificativa' THEN 1 END) as "Ata Retificativa",
  COUNT(CASE WHEN c.act_type = 'Escritura de Reconhecimento e Dissolução de União Estável' THEN 1 END) as "Escritura de Reconhecimento e Dissolução de União Estável",
  COUNT(CASE WHEN c.act_type = 'Escritura de Restabelecimento de Sociedade Conjugal' THEN 1 END) as "Escritura de Restabelecimento de Sociedade Conjugal",
  COUNT(CASE WHEN c.act_type = 'Escritura de Declaração de união estável' THEN 1 END) as "Escritura de Declaração de união estável",
  COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as "Não definido",
  -- Calcular métricas adicionais
  COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as "Total Classificados",
  CASE 
    WHEN COUNT(c.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END)::numeric / COUNT(c.id)) * 100, 1)
  END as "Percentual Classificados"
FROM public.lists l
LEFT JOIN public.cards c ON l.id = c.current_list_id
WHERE l.closed = false
GROUP BY l.id, l.name, l.pos
ORDER BY l.pos;

-- View adicional para análise rápida: Resumo executivo por lista
CREATE OR REPLACE VIEW dashboard_list_summary AS
SELECT 
  l.name as list_name,
  l.pos as list_position,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as classified_cards,
  COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as unclassified_cards,
  COUNT(DISTINCT c.act_type) as unique_act_types,
  CASE 
    WHEN COUNT(c.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END)::numeric / COUNT(c.id)) * 100, 1)
  END as completion_percentage,
  CASE 
    WHEN COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) = 0 THEN 'Pendente'
    WHEN COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) = 0 THEN 'Completa'
    ELSE 'Parcial'
  END as status
FROM public.lists l
LEFT JOIN public.cards c ON l.id = c.current_list_id
WHERE l.closed = false
GROUP BY l.id, l.name, l.pos
ORDER BY l.pos;

-- Forçar o PostgREST a recarregar o cache de schema
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');