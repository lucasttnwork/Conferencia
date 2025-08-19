-- Tabela de aliases para classificar cards por correspondência determinística
BEGIN;

CREATE TABLE IF NOT EXISTS public.act_type_alias (
  alias_name TEXT PRIMARY KEY,
  act_type_name TEXT NOT NULL REFERENCES public.act_type(name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seeds (idempotentes) - conservadores
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

COMMIT;


