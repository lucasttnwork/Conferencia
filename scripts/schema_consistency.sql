-- Hardening de schema: FKs faltantes, índices únicos e validações de consistência
-- Alinha o modelo ao fluxo do webhook (inserir entidades base, depois relacionamentos, depois logs)

-- 1) FKs e índices únicos auxiliares
DO $$
BEGIN
    -- labels.board_id -> boards.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'labels_board_id_fkey'
    ) THEN
        ALTER TABLE public.labels
        ADD CONSTRAINT labels_board_id_fkey
        FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;
    END IF;

    -- webhook_events.board_id -> boards.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'webhook_events_board_id_fkey'
    ) THEN
        ALTER TABLE public.webhook_events
        ADD CONSTRAINT webhook_events_board_id_fkey
        FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Índice único para evitar reprocessar o mesmo webhook
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_trello_action_id_key ON public.webhook_events(trello_action_id);

-- 2) Tabela de associação explícita: membros de board
CREATE TABLE IF NOT EXISTS public.board_members (
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    role TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (board_id, member_id)
);

-- 3) Triggers de consistência de board
-- 3.1) cards.current_list_id deve apontar para uma lista do mesmo board do card
CREATE OR REPLACE FUNCTION public.fn_validate_card_list_board_consistency()
RETURNS TRIGGER AS $$
DECLARE
    list_board UUID;
BEGIN
    IF NEW.current_list_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT l.board_id INTO list_board FROM public.lists l WHERE l.id = NEW.current_list_id;

    IF list_board IS NULL THEN
        RAISE EXCEPTION 'Lista % inexistente para card %', NEW.current_list_id, NEW.id;
    END IF;

    IF list_board <> NEW.board_id THEN
        RAISE EXCEPTION 'Inconsistência: card(board_id=%) difere do board da lista atual (%)', NEW.board_id, list_board;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_card_list_board ON public.cards;
CREATE TRIGGER trg_validate_card_list_board
BEFORE INSERT OR UPDATE OF current_list_id, board_id ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_card_list_board_consistency();

-- 3.2) card_labels: card e label devem pertencer ao mesmo board
CREATE OR REPLACE FUNCTION public.fn_validate_card_labels_same_board()
RETURNS TRIGGER AS $$
DECLARE
    card_board UUID;
    label_board UUID;
BEGIN
    SELECT c.board_id INTO card_board FROM public.cards c WHERE c.id = NEW.card_id;
    SELECT lb.board_id INTO label_board FROM public.labels lb WHERE lb.id = NEW.label_id;

    IF card_board IS NULL OR label_board IS NULL THEN
        RAISE EXCEPTION 'Card ou Label inexistente (card=%, label=%)', NEW.card_id, NEW.label_id;
    END IF;

    IF card_board <> label_board THEN
        RAISE EXCEPTION 'Inconsistência: card(board_id=%) != label(board_id=%)', card_board, label_board;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_card_labels_board ON public.card_labels;
CREATE TRIGGER trg_validate_card_labels_board
BEFORE INSERT OR UPDATE ON public.card_labels
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_card_labels_same_board();

-- 3.3) card_members: membro deve pertencer ao board do card (via board_members)
CREATE OR REPLACE FUNCTION public.fn_validate_card_membership()
RETURNS TRIGGER AS $$
DECLARE
    card_board UUID;
    is_member BOOLEAN;
BEGIN
    SELECT c.board_id INTO card_board FROM public.cards c WHERE c.id = NEW.card_id;

    IF card_board IS NULL THEN
        RAISE EXCEPTION 'Card % inexistente', NEW.card_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.board_members bm WHERE bm.board_id = card_board AND bm.member_id = NEW.member_id
    ) INTO is_member;

    IF NOT is_member THEN
        RAISE EXCEPTION 'Membro % não pertence ao board % do card %', NEW.member_id, card_board, NEW.card_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_card_membership ON public.card_members;
CREATE TRIGGER trg_validate_card_membership
BEFORE INSERT OR UPDATE ON public.card_members
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_card_membership();

-- 3.4) card_movements: board do movimento deve ser o mesmo do card e das listas from/to (quando presentes)
CREATE OR REPLACE FUNCTION public.fn_validate_card_movements_board_consistency()
RETURNS TRIGGER AS $$
DECLARE
    card_board UUID;
    from_board UUID;
    to_board UUID;
BEGIN
    SELECT c.board_id INTO card_board FROM public.cards c WHERE c.id = NEW.card_id;
    IF card_board IS NULL THEN
        RAISE EXCEPTION 'Card % inexistente', NEW.card_id;
    END IF;

    IF NEW.board_id IS NULL OR NEW.board_id <> card_board THEN
        RAISE EXCEPTION 'Inconsistência: movimento(board_id=%) difere do board do card (%)', NEW.board_id, card_board;
    END IF;

    IF NEW.from_list_id IS NOT NULL THEN
        SELECT l.board_id INTO from_board FROM public.lists l WHERE l.id = NEW.from_list_id;
        IF from_board IS NULL OR from_board <> NEW.board_id THEN
            RAISE EXCEPTION 'Inconsistência: from_list(board_id=%) difere do movimento(board_id=%)', from_board, NEW.board_id;
        END IF;
    END IF;

    IF NEW.to_list_id IS NOT NULL THEN
        SELECT l.board_id INTO to_board FROM public.lists l WHERE l.id = NEW.to_list_id;
        IF to_board IS NULL OR to_board <> NEW.board_id THEN
            RAISE EXCEPTION 'Inconsistência: to_list(board_id=%) difere do movimento(board_id=%)', to_board, NEW.board_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_card_movements_board ON public.card_movements;
CREATE TRIGGER trg_validate_card_movements_board
BEFORE INSERT OR UPDATE ON public.card_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_card_movements_board_consistency();

-- 4) Triggers de updated_at automáticos
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='cards' AND column_name='updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS trg_touch_cards ON public.cards;
        CREATE TRIGGER trg_touch_cards
        BEFORE UPDATE ON public.cards
        FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='lists' AND column_name='updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS trg_touch_lists ON public.lists;
        CREATE TRIGGER trg_touch_lists
        BEFORE UPDATE ON public.lists
        FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='labels' AND column_name='updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS trg_touch_labels ON public.labels;
        CREATE TRIGGER trg_touch_labels
        BEFORE UPDATE ON public.labels
        FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
    END IF;
END $$;

-- 5) Normalização de card_events: remover colunas redundantes de nomes, manter apenas referências e payload
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='card_name') THEN
        ALTER TABLE public.card_events DROP COLUMN card_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='board_name') THEN
        ALTER TABLE public.card_events DROP COLUMN board_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='list_from_name') THEN
        ALTER TABLE public.card_events DROP COLUMN list_from_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='list_to_name') THEN
        ALTER TABLE public.card_events DROP COLUMN list_to_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='member_username') THEN
        ALTER TABLE public.card_events DROP COLUMN member_username;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='card_events' AND column_name='member_fullname') THEN
        ALTER TABLE public.card_events DROP COLUMN member_fullname;
    END IF;
END $$;

-- 6) Ações do Trello: opcionalmente padronizar action_type (tabela de domínio)
-- Mantido como TEXT por enquanto para flexibilidade; payload_json preserva o original

-- 7) Checks e índices de performance
-- Valores não negativos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='cards' AND column_name='act_value'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='cards_act_value_non_negative'
    ) THEN
        ALTER TABLE public.cards
        ADD CONSTRAINT cards_act_value_non_negative CHECK (act_value IS NULL OR act_value >= 0);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='lists' AND column_name='pos'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='lists_pos_non_negative'
    ) THEN
        ALTER TABLE public.lists
        ADD CONSTRAINT lists_pos_non_negative CHECK (pos IS NULL OR pos >= 0);
    END IF;
END $$;

-- Índices para consultas do dashboard
CREATE INDEX IF NOT EXISTS idx_lists_pos ON public.lists(pos);
CREATE INDEX IF NOT EXISTS idx_cards_current_list_act_type ON public.cards(current_list_id, act_type);

-- Remover índice redundante duplicado em card_movements (já existe idx_card_movements_card_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='card_movements' AND indexname='idx_movements_card'
    ) THEN
        EXECUTE 'DROP INDEX public.idx_movements_card';
    END IF;
END $$;


