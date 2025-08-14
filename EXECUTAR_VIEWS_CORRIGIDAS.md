# EXECUTAR VIEWS CORRIGIDAS NO SUPABASE

## Problema Identificado
- **Total real de cards**: 3.257
- **Total sendo contado**: 1.000
- **Cards não contados**: 2.257
- **Dados parciais**: Apenas a view `dashboard_total_cards` está funcionando

## Solução
Executar todas as views corrigidas para que todos os dados do dashboard sejam atualizados corretamente.

## Views a Executar

### 1. View dashboard_lists (CORRIGIDA)
```sql
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
```

### 2. View dashboard_act_types (ATUALIZADA)
```sql
CREATE OR REPLACE VIEW dashboard_act_types AS
SELECT 
  COALESCE(act_type, 'Não definido') as name,
  COUNT(*) as total_count,
  SUM(CASE WHEN act_value IS NOT NULL THEN act_value ELSE 0 END) as total_value
FROM public.cards
GROUP BY act_type
ORDER BY total_count DESC;
```

### 3. View dashboard_list_breakdown (ATUALIZADA)
```sql
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
```

### 4. View dashboard_list_pivot (ATUALIZADA)
```sql
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
```

### 5. View dashboard_list_summary (ATUALIZADA)
```sql
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
```

### 6. View dashboard_total_cards (JÁ EXISTE)
Esta view já está funcionando corretamente.

## Como Executar

### Opção 1: Via Supabase Dashboard (RECOMENDADO)
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole e execute cada view separadamente
4. Verifique se as views foram criadas corretamente

### Opção 2: Via Arquivo SQL
1. Use o arquivo `executar_views_corrigidas.sql` que contém todas as views
2. Execute todo o arquivo no SQL Editor do Supabase

## Resultado Esperado
Após executar todas as views:
- **Total de cards**: 3.257 ✅
- **Cards classificados**: 3.027 ✅
- **Cards pendentes**: 230 ✅
- **Valor total**: R$ 5.000.000,00 ✅
- **Todas as seções do dashboard**: Atualizadas com dados corretos

## Verificação
Após executar as views, teste a API:
```bash
curl -X GET "http://localhost:3000/api/dashboard" | jq '.overall'
```

## Atualizações do Sistema
- **Atualização automática**: Alterada de 30 segundos para 30 minutos
- **Botão "Atualizar"**: Funcionando corretamente para atualização manual
- **Interface**: Atualizada para refletir o novo intervalo de atualização
