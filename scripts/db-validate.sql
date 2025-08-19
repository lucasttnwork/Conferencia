-- Validações simples do schema: existência de tabelas/chaves e views

\timing on

-- Tabelas essenciais
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('boards','members','lists','cards','card_events','card_movements') ORDER BY tablename;

-- Colunas chave em lists
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='lists' AND column_name IN ('id','trello_id','board_id','name','pos','closed');

-- Colunas chave em cards
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='cards' AND column_name IN ('id','trello_id','board_id','current_list_id','current_list_trello_id','name','is_closed');

-- card_events
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name IN ('id','trello_action_id','action_type','card_id','occurred_at');

-- card_movements
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='card_movements' AND column_name IN ('id','card_id','board_id','from_list_id','to_list_id','moved_at','occurred_at');

-- Views
SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name LIKE 'dashboard_%' ORDER BY table_name;



