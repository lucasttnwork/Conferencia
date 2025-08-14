-- Script SQL para verificação e correção de relacionamentos entre cards e lists
-- Execute este script no Supabase SQL Editor para uma análise detalhada

-- ============================================================================
-- 1. VERIFICAÇÃO DOS RELACIONAMENTOS
-- ============================================================================

-- Verificar cards que não têm current_list_id mas têm current_list_trello_id
SELECT 
  'MISSING_LIST_ID' as issue_type,
  c.id as card_id,
  c.trello_id as card_trello_id,
  c.name as card_name,
  c.current_list_id,
  c.current_list_trello_id,
  l.id as expected_list_id,
  l.name as expected_list_name
FROM cards c
LEFT JOIN lists l ON c.current_list_trello_id = l.trello_id
WHERE c.current_list_id IS NULL 
  AND c.current_list_trello_id IS NOT NULL
  AND l.id IS NOT NULL;

-- Verificar cards com current_list_id incorreto
SELECT 
  'MISMATCHED_LIST_ID' as issue_type,
  c.id as card_id,
  c.trello_id as card_trello_id,
  c.name as card_name,
  c.current_list_id,
  c.current_list_trello_id,
  l.id as expected_list_id,
  l.name as expected_list_name,
  cl.name as current_list_name
FROM cards c
LEFT JOIN lists l ON c.current_list_trello_id = l.trello_id
LEFT JOIN lists cl ON c.current_list_id = cl.id
WHERE c.current_list_id IS NOT NULL 
  AND c.current_list_trello_id IS NOT NULL
  AND l.id IS NOT NULL
  AND c.current_list_id != l.id;

-- Verificar cards órfãos (sem list correspondente)
SELECT 
  'ORPHANED_CARD' as issue_type,
  c.id as card_id,
  c.trello_id as card_trello_id,
  c.name as card_name,
  c.current_list_id,
  c.current_list_trello_id
FROM cards c
LEFT JOIN lists l ON c.current_list_trello_id = l.trello_id
WHERE c.current_list_trello_id IS NOT NULL
  AND l.id IS NULL;

-- Verificar cards sem nenhuma referência de list
SELECT 
  'NO_LIST_REFERENCE' as issue_type,
  c.id as card_id,
  c.trello_id as card_trello_id,
  c.name as card_name,
  c.current_list_id,
  c.current_list_trello_id
FROM cards c
WHERE c.current_list_id IS NULL 
  AND c.current_list_trello_id IS NULL;

-- ============================================================================
-- 2. ESTATÍSTICAS GERAIS
-- ============================================================================

-- Contagem total de cards por status
SELECT 
  CASE 
    WHEN c.current_list_id IS NULL AND c.current_list_trello_id IS NULL THEN 'Sem referência de list'
    WHEN c.current_list_id IS NULL AND c.current_list_trello_id IS NOT NULL THEN 'List ID ausente'
    WHEN c.current_list_id IS NOT NULL AND c.current_list_trello_id IS NOT NULL THEN 'Com referência completa'
    ELSE 'Status desconhecido'
  END as status,
  COUNT(*) as total_cards
FROM cards c
GROUP BY 
  CASE 
    WHEN c.current_list_id IS NULL AND c.current_list_trello_id IS NULL THEN 'Sem referência de list'
    WHEN c.current_list_id IS NULL AND c.current_list_trello_id IS NOT NULL THEN 'List ID ausente'
    WHEN c.current_list_id IS NOT NULL AND c.current_list_trello_id IS NOT NULL THEN 'Com referência completa'
    ELSE 'Status desconhecido'
  END
ORDER BY total_cards DESC;

-- Contagem de cards por list
SELECT 
  l.name as list_name,
  l.trello_id as list_trello_id,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.current_list_id IS NULL THEN 1 END) as cards_sem_list_id,
  COUNT(CASE WHEN c.current_list_id IS NOT NULL THEN 1 END) as cards_com_list_id
FROM lists l
LEFT JOIN cards c ON l.trello_id = c.current_list_trello_id
WHERE l.closed = false
GROUP BY l.id, l.name, l.trello_id
ORDER BY total_cards DESC;

-- ============================================================================
-- 3. CORREÇÕES AUTOMÁTICAS
-- ============================================================================

-- Função para corrigir list_id ausente baseado no current_list_trello_id
CREATE OR REPLACE FUNCTION fix_missing_list_ids()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Corrigir cards que têm current_list_trello_id mas não têm current_list_id
  UPDATE cards c
  SET current_list_id = l.id
  FROM lists l
  WHERE c.current_list_trello_id = l.trello_id
    AND c.current_list_id IS NULL
    AND l.closed = false;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RETURN fixed_count;
END;
$$;

-- Função para corrigir list_id incorreto
CREATE OR REPLACE FUNCTION fix_mismatched_list_ids()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Corrigir cards com current_list_id incorreto
  UPDATE cards c
  SET current_list_id = l.id
  FROM lists l
  WHERE c.current_list_trello_id = l.trello_id
    AND c.current_list_id != l.id
    AND l.closed = false;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RETURN fixed_count;
END;
$$;

-- Função para limpar referências inválidas
CREATE OR REPLACE FUNCTION clean_invalid_list_references()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Limpar current_list_id quando a list não existe mais
  UPDATE cards c
  SET current_list_id = NULL
  WHERE c.current_list_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM lists l WHERE l.id = c.current_list_id
    );
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- ============================================================================
-- 4. EXECUÇÃO DAS CORREÇÕES
-- ============================================================================

-- Executar correções (descomente as linhas abaixo para aplicar)

-- SELECT 'Corrigindo list IDs ausentes...' as status;
-- SELECT fix_missing_list_ids() as cards_corrigidos;

-- SELECT 'Corrigindo list IDs incorretos...' as status;
-- SELECT fix_mismatched_list_ids() as cards_corrigidos;

-- SELECT 'Limpando referências inválidas...' as status;
-- SELECT clean_invalid_list_references() as referencias_limpas;

-- ============================================================================
-- 5. VERIFICAÇÃO PÓS-CORREÇÃO
-- ============================================================================

-- Verificar se ainda existem problemas após as correções
SELECT 
  'VERIFICAÇÃO PÓS-CORREÇÃO' as status,
  COUNT(*) as total_cards,
  COUNT(CASE WHEN current_list_id IS NULL THEN 1 END) as cards_sem_list_id,
  COUNT(CASE WHEN current_list_id IS NOT NULL THEN 1 END) as cards_com_list_id,
  COUNT(CASE WHEN current_list_id IS NULL AND current_list_trello_id IS NOT NULL THEN 1 END) as cards_com_problema
FROM cards;

-- Verificar integridade referencial
SELECT 
  'INTEGRIDADE REFERENCIAL' as status,
  COUNT(*) as total_cards,
  COUNT(CASE WHEN c.current_list_id IS NOT NULL AND l.id IS NULL THEN 1 END) as referencias_quebradas
FROM cards c
LEFT JOIN lists l ON c.current_list_id = l.id;

-- ============================================================================
-- 6. LIMPEZA (OPCIONAL - USE COM CUIDADO)
-- ============================================================================

-- Remover funções temporárias (descomente se quiser limpar)
-- DROP FUNCTION IF EXISTS fix_missing_list_ids();
-- DROP FUNCTION IF EXISTS fix_mismatched_list_ids();
-- DROP FUNCTION IF EXISTS clean_invalid_list_references();
