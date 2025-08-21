-- Validações simples do schema: existência de tabelas/chaves e views

\timing on

-- Tabelas essenciais
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('boards','members','lists','cards','card_events','card_movements') ORDER BY tablename;

-- Colunas chave em lists
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='lists' AND column_name IN ('id','trello_id','board_id','name','pos','closed');

-- Colunas chave em cards
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='cards' AND column_name IN ('id','trello_id','board_id','current_list_id','current_list_trello_id','name','is_closed');

-- Backfill: sincronizar current_list_id a partir de current_list_trello_id (se necessário)
-- e vice-versa. Execute com cautela em produção, idealmente dentro de transação.

-- Preencher current_list_id quando estiver nulo e houver current_list_trello_id
-- UPDATE public.cards c
-- SET current_list_id = l.id
-- FROM public.lists l
-- WHERE c.current_list_id IS NULL
--   AND c.current_list_trello_id IS NOT NULL
--   AND l.trello_id = c.current_list_trello_id;

-- Preencher current_list_trello_id quando estiver nulo e current_list_id estiver presente
-- UPDATE public.cards c
-- SET current_list_trello_id = l.trello_id
-- FROM public.lists l
-- WHERE c.current_list_trello_id IS NULL
--   AND c.current_list_id IS NOT NULL
--   AND l.id = c.current_list_id;

-- Preencher created_by_member_id para cards com evento de criação registrado
-- UPDATE public.cards c
-- SET created_by_member_id = ce.member_id
-- FROM (
--   SELECT card_id, member_id
--   FROM public.card_events
--   WHERE action_type = 'createCard' AND member_id IS NOT NULL
--   ORDER BY occurred_at ASC
-- ) ce
-- WHERE c.id = ce.card_id
--   AND c.created_by_member_id IS NULL;

-- card_events
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name IN ('id','trello_action_id','action_type','card_id','occurred_at');

-- card_movements
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='card_movements' AND column_name IN ('id','card_id','board_id','from_list_id','to_list_id','moved_at','occurred_at');

-- Views
SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name LIKE 'dashboard_%' ORDER BY table_name;



