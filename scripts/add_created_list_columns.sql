BEGIN;

-- 1) Adicionar colunas para registrar a lista de criação do card
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS created_list_id TEXT,
  ADD COLUMN IF NOT EXISTS created_list_trello_id TEXT;

-- 2) Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_cards_created_list_id ON public.cards(created_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_list_trello ON public.cards(created_list_trello_id);

-- 3) FK opcional para lists(id) quando disponível
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cards_created_list_id_fkey' AND conrelid = 'public.cards'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'lists'
    ) THEN
      BEGIN
        ALTER TABLE public.cards
          ADD CONSTRAINT cards_created_list_id_fkey
          FOREIGN KEY (created_list_id) REFERENCES public.lists(id)
          ON UPDATE CASCADE ON DELETE SET NULL;
      EXCEPTION WHEN others THEN
        -- Ignorar erro caso o tipo/coluna não seja compatível no schema atual
        NULL;
      END;
    END IF;
  END IF;
END $$;

-- 4) Backfill a partir de card_events (createCard) para os últimos 60 dias
WITH creations AS (
  SELECT
    ce.card_id::text AS trello_card_id,
    COALESCE(ce.list_to_id::text, ce.list_from_id::text) AS trello_list_id,
    ce.occurred_at,
    ROW_NUMBER() OVER (PARTITION BY ce.card_id ORDER BY ce.occurred_at ASC) AS rn
  FROM public.card_events ce
  WHERE (ce.action_type = 'createCard' OR ce.raw_action_type = 'createCard')
    AND ce.card_id IS NOT NULL
    AND (ce.list_to_id IS NOT NULL OR ce.list_from_id IS NOT NULL)
    AND ce.occurred_at >= NOW() - INTERVAL '60 days'
), selected AS (
  SELECT trello_card_id, trello_list_id
  FROM creations
  WHERE rn = 1
)
UPDATE public.cards c
SET
  created_list_trello_id = s.trello_list_id,
  created_list_id = l.id,
  updated_at = COALESCE(c.updated_at, NOW())
FROM selected s
LEFT JOIN public.lists l ON l.trello_id::text = s.trello_list_id
WHERE c.trello_id::text = s.trello_card_id
  AND (c.created_list_trello_id IS NULL OR c.created_list_id IS NULL);

COMMIT;


