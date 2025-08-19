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
  LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
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
  WHERE COALESCE(c.is_closed, false) = false
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
  LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
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
  LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
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
  WHERE c.current_list_id IS NULL AND COALESCE(c.is_closed, false) = false
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
FROM public.cards
WHERE COALESCE(is_closed, false) = false;

-- View para tipos de ato
CREATE OR REPLACE VIEW dashboard_act_types AS
SELECT 
  COALESCE(act_type, 'Não definido') as name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN current_list_id IS NOT NULL THEN 1 END) as active_cards,
  SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
FROM public.cards
WHERE COALESCE(is_closed, false) = false
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
  LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
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
LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
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
LEFT JOIN public.cards c ON l.id = c.current_list_id AND COALESCE(c.is_closed, false) = false
WHERE l.closed = false
GROUP BY l.id, l.name, l.pos
ORDER BY l.pos;

-- View: cards abertos (não arquivados)
CREATE OR REPLACE VIEW open_cards AS
SELECT 
  c.id,
  c.name,
  c.act_type,
  c.act_value,
  c.clerk_name,
  c.current_list_id,
  l.name AS list_name,
  l.pos AS list_position
FROM public.cards c
LEFT JOIN public.lists l ON l.id = c.current_list_id
WHERE COALESCE(c.is_closed, false) = false;

-- View: atividade por membro (movimentações e arquivamentos)
CREATE OR REPLACE VIEW member_activity AS
-- Parte 1: movimentos (create/move) vindos de card_movements, resolvendo nomes por JOINs
SELECT 
  COALESCE(cm.moved_at, cm.occurred_at) AS occurred_at,
  (cm.trello_action_id)::text AS trello_action_id,
  (cm.card_id)::text AS card_id,
  CASE 
    WHEN cm.from_list_id IS NULL AND cm.to_list_id IS NOT NULL THEN 'create' 
    ELSE 'move' 
  END AS action_type,
  (cm.moved_by_member_id)::text AS member_id,
  m.username::text AS member_username,
  m.full_name::text AS member_fullname,
  (cm.from_list_id)::text AS from_list_id,
  lf.name::text AS from_list_name,
  (cm.to_list_id)::text AS to_list_id,
  lt.name::text AS to_list_name,
  c.act_type::text AS act_type
FROM public.card_movements cm
LEFT JOIN public.cards c ON c.id = cm.card_id
LEFT JOIN public.members m ON m.id = cm.moved_by_member_id
LEFT JOIN public.lists lf ON lf.id = cm.from_list_id
LEFT JOIN public.lists lt ON lt.id = cm.to_list_id
UNION ALL
-- Parte 2: eventos (archive/unarchive/delete) vindos de card_events
SELECT 
  ce.occurred_at,
  (ce.trello_action_id)::text AS trello_action_id,
  (ce.card_id)::text AS card_id,
  (ce.action_type)::text AS action_type,
  (ce.member_id)::text AS member_id,
  COALESCE(ce.member_username, m2.username)::text AS member_username,
  COALESCE(ce.member_fullname, m2.full_name)::text AS member_fullname,
  (ce.list_from_id)::text AS from_list_id,
  COALESCE(ce.list_from_name, lf2.name)::text AS from_list_name,
  (ce.list_to_id)::text AS to_list_id,
  COALESCE(ce.list_to_name, lt2.name)::text AS to_list_name,
  c.act_type::text AS act_type
FROM public.card_events ce
LEFT JOIN public.cards c ON c.id = ce.card_id
LEFT JOIN public.members m2 ON m2.id = ce.member_id
LEFT JOIN public.lists lf2 ON lf2.id = ce.list_from_id
LEFT JOIN public.lists lt2 ON lt2.id = ce.list_to_id
WHERE ce.action_type IN ('archive', 'unarchive', 'delete');
