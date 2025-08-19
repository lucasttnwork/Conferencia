-- Prévia dos melhores matches para preencher cards.act_type sem aplicar atualização
-- Uso no Supabase SQL Editor: executar este SELECT para revisar as sugestões

CREATE EXTENSION IF NOT EXISTS pg_trgm;

WITH candidates AS (
  SELECT 
    c.id,
    c.name AS card_name,
    at.name AS act_type_name,
    GREATEST(
      CASE WHEN position(lower(at.name) in lower(c.name)) > 0 THEN 1.0 ELSE 0 END,
      similarity(lower(c.name), lower(at.name))
    ) AS score
  FROM public.cards c
  CROSS JOIN public.act_type at
  WHERE c.act_type IS NULL AND c.name IS NOT NULL
), best AS (
  SELECT 
    id,
    card_name,
    act_type_name,
    score,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY score DESC) AS rn
  FROM candidates
)
SELECT 
  id AS card_id,
  card_name,
  act_type_name AS suggested_act_type,
  ROUND(score::numeric, 3) AS score
FROM best
WHERE rn = 1
ORDER BY score DESC
LIMIT 50;


