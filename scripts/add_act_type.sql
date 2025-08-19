-- Migração: criar tabela de domínio act_type e tornar cards.act_type uma FK
-- Pode ser executada no Supabase SQL editor ou via psql

BEGIN;

-- 1) Criar tabela de domínio
CREATE TABLE IF NOT EXISTS public.act_type (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Inserir valores padrão (idempotente)
INSERT INTO public.act_type(name) VALUES
('Escritura de Venda e Compra'),
('Escritura de Divórcio'),
('Procuração'),
('Escritura de Confissão de Dívida e Promessa de Dação em pagamento'),
('Retificação e Ratificação'),
('Escritura de Pacto Antenupcial'),
('Ata Retificativa'),
('Testamento'),
('Ata Notarial'),
('Escritura de Revogação de Procuração'),
('Diretivas Antecipadas de Vontade'),
('Escritura de Nomeação de inventariante'),
('Escritura de Reconhecimento e Dissolução de União Estável'),
('Escritura de Dissolução de União Estável'),
('Escritura de Renuncia de Herança'),
('Aditamento'),
('Escritura de Renuncia de Usufruto'),
('Escritura de Dação em Pagamento'),
('Ata Notarial para Usucapião'),
('Escritura Pública de União Estável'),
('Rerratificação'),
('Escritura de Inventário'),
('Escritura de Cessão de Direitos'),
('Arrolamento E Partilha'),
('Escritura de Sobrepartilha'),
('Escritura Pública de Instituição Amigável de Servidão Administrativa a Título Gratuito'),
('Escritura de alienação fiduciária'),
('Substabelecimento'),
('Escritura de Doação'),
('Escritura de Emancipação'),
('Escritura de Abertura de Crédito Rotativo com Garantia Hipotecária'),
('Escritura de Inventário e Adjudicação'),
('Escritura de Inventário e Partilha'),
('Escritura de Divisão amigável'),
('Cancelamento de Cláusulas'),
('Escritura de Declaração de Namoro'),
('Escritura de Constituição de Servidão Perpétua e Gratuita de Passagem')
ON CONFLICT (name) DO NOTHING;

-- 3) Sincronizar valores já existentes em cards.act_type
INSERT INTO public.act_type(name)
SELECT DISTINCT act_type FROM public.cards WHERE act_type IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 4) Adicionar FK em cards.act_type -> act_type(name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cards_act_type_fkey' AND conrelid = 'public.cards'::regclass
  ) THEN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_act_type_fkey
      FOREIGN KEY (act_type) REFERENCES public.act_type(name)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;


