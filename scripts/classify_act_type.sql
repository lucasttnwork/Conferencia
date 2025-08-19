-- Função para classificar cards.act_type por similaridade com nomes de public.act_type
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Atualiza cards.act_type com o melhor match por similaridade do nome do card e do tipo
CREATE OR REPLACE FUNCTION public.classify_cards_act_type(threshold real DEFAULT 0.45)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  WITH candidates AS (
    SELECT 
      c.id,
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
      act_type_name,
      score,
      ROW_NUMBER() OVER (PARTITION BY id ORDER BY score DESC) AS rn
    FROM candidates
  )
  UPDATE public.cards c
  SET act_type = b.act_type_name
  FROM best b
  WHERE c.id = b.id AND b.rn = 1 AND b.score >= threshold;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMIT;


