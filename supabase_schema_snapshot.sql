-- Snapshot do schema atual (Supabase) para recriação fiel em caso de necessidade
-- Gerado a partir de inspeção do estado atual via MCP (information_schema + pg_indexes)

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remover views dependentes antes de recriar objetos
DROP VIEW IF EXISTS public.dashboard_stats;
DROP VIEW IF EXISTS public.dashboard_lists;
DROP VIEW IF EXISTS public.dashboard_total_cards;
DROP VIEW IF EXISTS public.dashboard_act_types;
DROP VIEW IF EXISTS public.dashboard_list_breakdown;
DROP VIEW IF EXISTS public.dashboard_list_pivot;
DROP VIEW IF EXISTS public.dashboard_list_summary;

-- Tabelas principais
CREATE TABLE IF NOT EXISTS public.boards (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	trello_id TEXT NOT NULL,
	name TEXT NOT NULL,
	url TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS boards_trello_id_key ON public.boards(trello_id);

CREATE TABLE IF NOT EXISTS public.members (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	trello_id TEXT NOT NULL,
	username TEXT NOT NULL,
	full_name TEXT,
	email TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS members_trello_id_key ON public.members(trello_id);

CREATE TABLE IF NOT EXISTS public.lists (
	id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
	trello_id TEXT NOT NULL,
	board_id UUID NOT NULL,
	name TEXT NOT NULL,
	pos NUMERIC,
	closed BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lists_trello_id_key ON public.lists(trello_id);
CREATE INDEX IF NOT EXISTS idx_lists_board ON public.lists(board_id);
CREATE INDEX IF NOT EXISTS idx_lists_trello ON public.lists(trello_id);

CREATE TABLE IF NOT EXISTS public.labels (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	trello_id TEXT NOT NULL,
	board_id UUID NOT NULL,
	name TEXT,
	color TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS labels_trello_id_key ON public.labels(trello_id);
CREATE INDEX IF NOT EXISTS idx_labels_board ON public.labels(board_id);

CREATE TABLE IF NOT EXISTS public.cards (
	id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
	trello_id TEXT NOT NULL,
	board_id UUID NOT NULL,
	current_list_id TEXT,
	current_list_trello_id TEXT,
	name TEXT,
	description TEXT,
	url TEXT,
	protocol_number TEXT,
	is_closed BOOLEAN NOT NULL DEFAULT FALSE,
	due_at TIMESTAMPTZ,
	received_at TIMESTAMPTZ,
	received_at_text TEXT,
	clerk_name TEXT,
	act_type TEXT,
	act_value NUMERIC,
	act_value_text TEXT,
	clerk_email TEXT,
	reconference BOOLEAN,
	created_by_member_id UUID,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS cards_trello_id_key ON public.cards(trello_id);
CREATE UNIQUE INDEX IF NOT EXISTS cards_board_id_protocol_number_key ON public.cards(board_id, protocol_number);
CREATE INDEX IF NOT EXISTS idx_cards_board ON public.cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_current_list_id ON public.cards(current_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_list ON public.cards(current_list_id);
CREATE INDEX IF NOT EXISTS idx_cards_list_trello ON public.cards(current_list_trello_id);
CREATE INDEX IF NOT EXISTS idx_cards_act_type ON public.cards(act_type);
CREATE INDEX IF NOT EXISTS idx_cards_protocol ON public.cards(protocol_number);

-- Relacionamentos N-N (chaves compostas)
CREATE TABLE IF NOT EXISTS public.card_labels (
	card_id TEXT NOT NULL,
	label_id UUID NOT NULL,
	PRIMARY KEY (card_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.card_members (
	card_id TEXT NOT NULL,
	member_id UUID NOT NULL,
	PRIMARY KEY (card_id, member_id)
);

-- Eventos (auditoria)
CREATE TABLE IF NOT EXISTS public.card_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	trello_action_id TEXT UNIQUE,
	action_type TEXT NOT NULL,
	raw_action_type TEXT,
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
	occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	payload_json JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_events_card_id ON public.card_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_events_occurred_at ON public.card_events(occurred_at);

-- Movimentações
CREATE TABLE IF NOT EXISTS public.card_movements (
	id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	card_id UUID NOT NULL,
	board_id UUID NOT NULL,
	from_list_id UUID,
	to_list_id UUID,
	moved_by_member_id UUID,
	moved_at TIMESTAMPTZ NOT NULL,
	trello_action_id TEXT,
	occurred_at TIMESTAMPTZ DEFAULT NOW(),
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS card_movements_trello_action_id_key ON public.card_movements(trello_action_id);
CREATE INDEX IF NOT EXISTS idx_card_movements_card_id ON public.card_movements(card_id);
CREATE INDEX IF NOT EXISTS idx_card_movements_occurred_at ON public.card_movements(occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_card ON public.card_movements(card_id);
CREATE INDEX IF NOT EXISTS idx_movements_member ON public.card_movements(moved_by_member_id);
CREATE INDEX IF NOT EXISTS idx_movements_time ON public.card_movements(moved_at);

-- Webhook (entrada bruta)
CREATE TABLE IF NOT EXISTS public.webhook_events (
	id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	board_id UUID,
	trello_action_id TEXT,
	action_type TEXT,
	payload JSONB NOT NULL,
	received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ
);

-- Views do dashboard (coerentes com app/api/dashboard)
CREATE OR REPLACE VIEW public.dashboard_stats AS
WITH list_stats AS (
	SELECT 
		l.trello_id as list_id,
		l.name as list_name,
		l.pos as list_position,
		COUNT(c.id) as total_cards,
		COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
		COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as cards_without_act_type
	FROM public.lists l
	LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
	WHERE l.closed = false
	GROUP BY l.trello_id, l.name, l.pos
),
act_type_stats AS (
	SELECT 
		COALESCE(act_type, 'Não definido') as act_type_name,
		COUNT(*) as total_count,
		COUNT(CASE WHEN c.current_list_id IS NOT NULL OR c.current_list_trello_id IS NOT NULL THEN 1 END) as active_cards,
		SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
	FROM public.cards c
	GROUP BY act_type
),
list_act_type_breakdown AS (
	SELECT 
		l.trello_id as list_id,
		l.name as list_name,
		l.pos as list_position,
		COALESCE(c.act_type, 'Não definido') as act_type_name,
		COUNT(*) as cards_count,
		SUM(CASE WHEN c.act_value IS NOT NULL THEN c.act_value ELSE 0 END) as total_value
	FROM public.lists l
	LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
	WHERE l.closed = false
	GROUP BY l.trello_id, l.name, l.pos, c.act_type
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

CREATE OR REPLACE VIEW public.dashboard_lists AS
WITH list_stats AS (
	SELECT 
		l.trello_id as id,
		l.name,
		l.pos as position,
		COUNT(c.id) as total_cards,
		COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
		COUNT(CASE WHEN c.act_type IS NULL THEN 1 END) as cards_without_act_type
	FROM public.lists l
	LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
	WHERE l.closed = false
	GROUP BY l.trello_id, l.name, l.pos
),
orphaned_cards AS (
	SELECT 
		'Cards sem lista' as name,
		999999 as position,
		COUNT(*) as total_cards,
		COUNT(CASE WHEN act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
		COUNT(CASE WHEN act_type IS NULL THEN 1 END) as cards_without_act_type
	FROM public.cards c
	WHERE c.current_list_id IS NULL AND c.current_list_trello_id IS NULL
)
SELECT * FROM list_stats
UNION ALL
SELECT 
	(gen_random_uuid())::text as id,
	name,
	position,
	total_cards,
	cards_with_act_type,
	cards_without_act_type
FROM orphaned_cards
ORDER BY position;

CREATE OR REPLACE VIEW public.dashboard_total_cards AS
SELECT 
	COUNT(*) as total_cards,
	COUNT(CASE WHEN act_type IS NOT NULL THEN 1 END) as cards_with_act_type,
	COUNT(CASE WHEN act_type IS NULL THEN 1 END) as cards_without_act_type,
	COUNT(CASE WHEN clerk_name IS NOT NULL THEN 1 END) as cards_with_clerk,
	COUNT(CASE WHEN act_value IS NOT NULL THEN 1 END) as cards_with_value,
	SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value,
	COUNT(CASE WHEN reconference = true THEN 1 END) as cards_needing_reconference
FROM public.cards;

CREATE OR REPLACE VIEW public.dashboard_act_types AS
SELECT 
	COALESCE(act_type, 'Não definido') as name,
	COUNT(*) as total_count,
	SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
FROM public.cards
GROUP BY act_type
ORDER BY total_count DESC;

CREATE OR REPLACE VIEW public.dashboard_list_breakdown AS
WITH list_act_counts AS (
	SELECT 
		l.trello_id AS list_id,
		l.name AS list_name,
		l.pos AS list_position,
		COALESCE(c.act_type, 'Não definido') AS act_type_name,
		COUNT(*) AS cards_count,
		SUM(CASE WHEN c.act_value IS NOT NULL THEN c.act_value ELSE 0 END) AS total_value
	FROM public.lists l
	LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
	WHERE l.closed = false
	GROUP BY l.trello_id, l.name, l.pos, c.act_type
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

CREATE OR REPLACE VIEW public.dashboard_list_pivot AS
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
	COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END) as "Total Classificados",
	CASE 
		WHEN COUNT(c.id) = 0 THEN 0
		ELSE ROUND((COUNT(CASE WHEN c.act_type IS NOT NULL THEN 1 END)::numeric / COUNT(c.id)) * 100, 1)
	END as "Percentual Classificados"
FROM public.lists l
LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
WHERE l.closed = false
GROUP BY l.id, l.name, l.pos
ORDER BY l.pos;

CREATE OR REPLACE VIEW public.dashboard_list_summary AS
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
LEFT JOIN public.cards c ON l.trello_id = COALESCE(c.current_list_trello_id, c.current_list_id)
WHERE l.closed = false
GROUP BY l.id, l.name, l.pos
ORDER BY l.pos;

-- Recarregar schema para o PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');


