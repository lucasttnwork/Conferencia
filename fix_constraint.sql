-- Remover a constraint única de protocol_number que está causando conflito
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_board_id_protocol_number_key;

-- Adicionar índice simples em protocol_number (sem unique)
CREATE INDEX IF NOT EXISTS idx_cards_protocol_simple ON public.cards(protocol_number); 