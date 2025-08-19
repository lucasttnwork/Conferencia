BEGIN;

-- Extensão necessária para similaridade (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabela de aliases (garante existência e seeds)
CREATE TABLE IF NOT EXISTS public.act_type_alias (
  alias_name TEXT PRIMARY KEY,
  act_type_name TEXT NOT NULL REFERENCES public.act_type(name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.act_type_alias(alias_name, act_type_name) VALUES
('compra e venda', 'Escritura de Venda e Compra'),
('venda e compra', 'Escritura de Venda e Compra'),
('procuração', 'Procuração'),
('procuracao', 'Procuração'),
('procuraçao', 'Procuração'),
('procuraçâo', 'Procuração'),
('inventario e partilha', 'Escritura de Inventário e Partilha'),
('inventário e partilha', 'Escritura de Inventário e Partilha'),
('inventário e adjudicação', 'Escritura de Inventário e Adjudicação'),
('inventario e adjudicação', 'Escritura de Inventário e Adjudicação'),
('inventario e adjudicacao', 'Escritura de Inventário e Adjudicação'),
('cessão de direitos', 'Escritura de Cessão de Direitos'),
('cessao de direitos', 'Escritura de Cessão de Direitos'),
('cessão de crédito', 'Escritura de Cessão de Direitos'),
('cessao de credito', 'Escritura de Cessão de Direitos'),
('renuncia de herança', 'Escritura de Renuncia de Herança'),
('renúncia de herança', 'Escritura de Renuncia de Herança'),
('renuncia de usufruto', 'Escritura de Renuncia de Usufruto'),
('renúncia de usufruto', 'Escritura de Renuncia de Usufruto'),
('alienação fiduciaria', 'Escritura de alienação fiduciária'),
('alienação fiduciária', 'Escritura de alienação fiduciária'),
('alienacao fiduciaria', 'Escritura de alienação fiduciária'),
('divisão amigável', 'Escritura de Divisão amigável'),
('divisao amigavel', 'Escritura de Divisão amigável'),
('união estável', 'Escritura Pública de União Estável'),
('uniao estavel', 'Escritura Pública de União Estável'),
('confissão de dívida', 'Escritura de Confissão de Dívida e Promessa de Dação em pagamento'),
('confissao de divida', 'Escritura de Confissão de Dívida e Promessa de Dação em pagamento'),
('ata notarial', 'Ata Notarial'),
('usucapião', 'Ata Notarial para Usucapião'),
('usucapiao', 'Ata Notarial para Usucapião'),
('doação', 'Escritura de Doação'),
('doacao', 'Escritura de Doação'),
('emancipação', 'Escritura de Emancipação'),
('emancipacao', 'Escritura de Emancipação'),
('sobrepartilha', 'Escritura de Sobrepartilha'),
('nomeação de inventariante', 'Escritura de Nomeação de inventariante'),
('nomeacao de inventariante', 'Escritura de Nomeação de inventariante'),
('nomeação de inventáriante', 'Escritura de Nomeação de inventariante'),
('nomeacao de inventáriante', 'Escritura de Nomeação de inventariante'),
('união estavel', 'Escritura Pública de União Estável')
ON CONFLICT (alias_name) DO NOTHING;

-- Função helper: devolve o melhor act_type para um nome de card
CREATE OR REPLACE FUNCTION public.fn_guess_act_type(p_name TEXT, p_threshold REAL DEFAULT 0.45)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_name_lower TEXT;
  v_alias_match TEXT;
  v_guess TEXT;
  v_score REAL;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN NULL;
  END IF;
  v_name_lower := lower(p_name);

  -- 1) Match determinístico por alias (prioriza alias mais longo)
  SELECT a.act_type_name
  INTO v_alias_match
  FROM public.act_type_alias a
  WHERE v_name_lower LIKE '%' || a.alias_name || '%'
  ORDER BY length(a.alias_name) DESC
  LIMIT 1;

  IF v_alias_match IS NOT NULL THEN
    RETURN v_alias_match;
  END IF;

  -- 2) Similaridade por trigram + substring exacta do tipo dentro do nome
  SELECT at.name,
         GREATEST(
           CASE WHEN position(lower(at.name) in v_name_lower) > 0 THEN 1.0 ELSE 0 END,
           similarity(v_name_lower, lower(at.name))
         ) AS score
  INTO v_guess, v_score
  FROM public.act_type at
  ORDER BY score DESC
  LIMIT 1;

  IF v_guess IS NOT NULL AND v_score >= p_threshold THEN
    RETURN v_guess;
  END IF;

  RETURN NULL;
END;
$$;

-- Backfill em lote (compatível, usa a função helper)
CREATE OR REPLACE FUNCTION public.classify_cards_act_type(p_threshold REAL DEFAULT 0.45)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.cards c
  SET act_type = public.fn_guess_act_type(c.name, p_threshold)
  WHERE c.act_type IS NULL AND c.name IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Trigger para classificar automaticamente no INSERT/UPDATE do nome
CREATE OR REPLACE FUNCTION public.trg_cards_set_act_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_guess TEXT;
BEGIN
  IF NEW.act_type IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS NULL THEN
    RETURN NEW;
  END IF;

  v_guess := public.fn_guess_act_type(NEW.name, 0.45);
  IF v_guess IS NOT NULL THEN
    NEW.act_type := v_guess;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'cards_set_act_type_auto'
  ) THEN
    CREATE TRIGGER cards_set_act_type_auto
    BEFORE INSERT OR UPDATE OF name ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_cards_set_act_type();
  END IF;
END;
$$;

COMMIT;


