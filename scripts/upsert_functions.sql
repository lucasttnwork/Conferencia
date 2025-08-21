-- Funções de upsert para entidades Trello: boards, members, board_members, lists, labels, cards
-- Funções auxiliares para relacionamentos, movimentos e logs

CREATE OR REPLACE FUNCTION public.fn_upsert_board(
    p_trello_id TEXT,
    p_name TEXT,
    p_url TEXT
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.boards(trello_id, name, url)
    VALUES (p_trello_id, p_name, p_url)
    ON CONFLICT (trello_id) DO UPDATE SET
        name = EXCLUDED.name,
        url = EXCLUDED.url
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_upsert_member(
    p_trello_id TEXT,
    p_username TEXT,
    p_full_name TEXT,
    p_email TEXT
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.members(trello_id, username, full_name, email)
    VALUES (p_trello_id, p_username, p_full_name, p_email)
    ON CONFLICT (trello_id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_upsert_board_member(
    p_board_trello_id TEXT,
    p_member_trello_id TEXT,
    p_role TEXT
) RETURNS VOID AS $$
DECLARE
    v_board_id UUID;
    v_member_id UUID;
BEGIN
    SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    IF v_board_id IS NULL THEN
        RAISE EXCEPTION 'Board trello_id % inexistente', p_board_trello_id;
    END IF;

    SELECT id INTO v_member_id FROM public.members WHERE trello_id = p_member_trello_id;
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Member trello_id % inexistente', p_member_trello_id;
    END IF;

    INSERT INTO public.board_members(board_id, member_id, role)
    VALUES (v_board_id, v_member_id, p_role)
    ON CONFLICT (board_id, member_id) DO UPDATE SET role = COALESCE(EXCLUDED.role, public.board_members.role);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_upsert_list(
    p_trello_id TEXT,
    p_board_trello_id TEXT,
    p_name TEXT,
    p_pos NUMERIC,
    p_closed BOOLEAN
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_board_id UUID;
BEGIN
    SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    IF v_board_id IS NULL THEN
        -- criar placeholder do board se não existir
        INSERT INTO public.boards(trello_id, name)
        VALUES (p_board_trello_id, COALESCE(p_board_trello_id, 'Unknown'))
        ON CONFLICT (trello_id) DO NOTHING;
        SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    END IF;

    INSERT INTO public.lists(trello_id, board_id, name, pos, closed)
    VALUES (p_trello_id, v_board_id, p_name, p_pos, COALESCE(p_closed, FALSE))
    ON CONFLICT (trello_id) DO UPDATE SET
        board_id = EXCLUDED.board_id,
        name = EXCLUDED.name,
        pos = EXCLUDED.pos,
        closed = EXCLUDED.closed,
        updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_upsert_label(
    p_trello_id TEXT,
    p_board_trello_id TEXT,
    p_name TEXT,
    p_color TEXT
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_board_id UUID;
BEGIN
    SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    IF v_board_id IS NULL THEN
        INSERT INTO public.boards(trello_id, name)
        VALUES (p_board_trello_id, COALESCE(p_board_trello_id, 'Unknown'))
        ON CONFLICT (trello_id) DO NOTHING;
        SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    END IF;

    INSERT INTO public.labels(trello_id, board_id, name, color)
    VALUES (p_trello_id, v_board_id, p_name, p_color)
    ON CONFLICT (trello_id) DO UPDATE SET
        board_id = EXCLUDED.board_id,
        name = EXCLUDED.name,
        color = EXCLUDED.color
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_upsert_card(
    p_trello_id TEXT,
    p_board_trello_id TEXT,
    p_current_list_trello_id TEXT,
    p_name TEXT,
    p_description TEXT,
    p_url TEXT,
    p_is_closed BOOLEAN,
    p_due_at TIMESTAMPTZ,
    p_created_by_member_trello_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_board_id UUID;
    v_list_id UUID;
    v_created_by_member_id UUID;
BEGIN
    SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    IF v_board_id IS NULL THEN
        -- criar placeholder do board se for referenciado por ação antes de chegar a carga completa
        INSERT INTO public.boards(trello_id, name)
        VALUES (p_board_trello_id, COALESCE(p_board_trello_id, 'Unknown'))
        ON CONFLICT (trello_id) DO NOTHING;
        SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    END IF;

    IF p_current_list_trello_id IS NOT NULL THEN
        SELECT id INTO v_list_id FROM public.lists WHERE trello_id = p_current_list_trello_id;
    ELSE
        v_list_id := NULL;
    END IF;

    IF p_created_by_member_trello_id IS NOT NULL THEN
        SELECT id INTO v_created_by_member_id FROM public.members WHERE trello_id = p_created_by_member_trello_id;
    ELSE
        v_created_by_member_id := NULL;
    END IF;

    INSERT INTO public.cards(
        trello_id,
        board_id,
        current_list_id,
        name,
        description,
        url,
        is_closed,
        due_at,
        created_by_member_id
    )
    VALUES (
        p_trello_id,
        v_board_id,
        v_list_id,
        p_name,
        p_description,
        p_url,
        COALESCE(p_is_closed, FALSE),
        p_due_at,
        v_created_by_member_id
    )
    ON CONFLICT (trello_id) DO UPDATE SET
        board_id = EXCLUDED.board_id,
        current_list_id = EXCLUDED.current_list_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        url = EXCLUDED.url,
        is_closed = EXCLUDED.is_closed,
        due_at = EXCLUDED.due_at,
        created_by_member_id = COALESCE(public.cards.created_by_member_id, EXCLUDED.created_by_member_id),
        updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_attach_card_labels(
    p_card_trello_id TEXT,
    p_label_trello_ids TEXT[]
) RETURNS VOID AS $$
DECLARE
    v_card_id UUID;
    v_label_id UUID;
    v_label_tid TEXT;
BEGIN
    SELECT id INTO v_card_id FROM public.cards WHERE trello_id = p_card_trello_id;
    IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'Card trello_id % inexistente', p_card_trello_id;
    END IF;

    IF p_label_trello_ids IS NULL THEN
        RETURN;
    END IF;

    FOREACH v_label_tid IN ARRAY p_label_trello_ids LOOP
        SELECT id INTO v_label_id FROM public.labels WHERE trello_id = v_label_tid;
        IF v_label_id IS NOT NULL THEN
            INSERT INTO public.card_labels(card_id, label_id)
            VALUES (v_card_id, v_label_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_attach_card_members(
    p_card_trello_id TEXT,
    p_member_trello_ids TEXT[]
) RETURNS VOID AS $$
DECLARE
    v_card_id UUID;
    v_member_id UUID;
    v_member_tid TEXT;
BEGIN
    SELECT id INTO v_card_id FROM public.cards WHERE trello_id = p_card_trello_id;
    IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'Card trello_id % inexistente', p_card_trello_id;
    END IF;

    IF p_member_trello_ids IS NULL THEN
        RETURN;
    END IF;

    FOREACH v_member_tid IN ARRAY p_member_trello_ids LOOP
        SELECT id INTO v_member_id FROM public.members WHERE trello_id = v_member_tid;
        IF v_member_id IS NOT NULL THEN
            INSERT INTO public.card_members(card_id, member_id)
            VALUES (v_card_id, v_member_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_set_card_list_by_trello(
    p_card_trello_id TEXT,
    p_to_list_trello_id TEXT,
    p_moved_by_member_trello_id TEXT,
    p_moved_at TIMESTAMPTZ,
    p_trello_action_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_card_id UUID;
    v_board_id UUID;
    v_from_list_id UUID;
    v_to_list_id UUID;
    v_member_id UUID;
BEGIN
    SELECT id, board_id, current_list_id INTO v_card_id, v_board_id, v_from_list_id FROM public.cards WHERE trello_id = p_card_trello_id;
    IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'Card trello_id % inexistente', p_card_trello_id;
    END IF;

    SELECT id INTO v_to_list_id FROM public.lists WHERE trello_id = p_to_list_trello_id;
    IF v_to_list_id IS NULL THEN
        RAISE EXCEPTION 'Lista destino trello_id % inexistente', p_to_list_trello_id;
    END IF;

    IF p_moved_by_member_trello_id IS NOT NULL THEN
        SELECT id INTO v_member_id FROM public.members WHERE trello_id = p_moved_by_member_trello_id;
    ELSE
        v_member_id := NULL;
    END IF;

    UPDATE public.cards
    SET current_list_id = v_to_list_id,
        updated_at = NOW()
    WHERE id = v_card_id;

    INSERT INTO public.card_movements(
        card_id, board_id, from_list_id, to_list_id, moved_by_member_id, moved_at, trello_action_id, occurred_at
    ) VALUES (
        v_card_id, v_board_id, v_from_list_id, v_to_list_id, v_member_id, COALESCE(p_moved_at, NOW()), p_trello_action_id, NOW()
    ) ON CONFLICT (trello_action_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_record_card_event(
    p_trello_action_id TEXT,
    p_action_type TEXT,
    p_card_trello_id TEXT,
    p_board_trello_id TEXT,
    p_list_from_trello_id TEXT,
    p_list_to_trello_id TEXT,
    p_member_trello_id TEXT,
    p_occurred_at TIMESTAMPTZ,
    p_payload_json JSONB
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_card_id UUID;
    v_board_id UUID;
    v_from_list_id UUID;
    v_to_list_id UUID;
    v_member_id UUID;
BEGIN
    IF p_card_trello_id IS NOT NULL THEN
        SELECT id INTO v_card_id FROM public.cards WHERE trello_id = p_card_trello_id;
    END IF;
    IF p_board_trello_id IS NOT NULL THEN
        SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    END IF;
    IF p_list_from_trello_id IS NOT NULL THEN
        SELECT id INTO v_from_list_id FROM public.lists WHERE trello_id = p_list_from_trello_id;
    END IF;
    IF p_list_to_trello_id IS NOT NULL THEN
        SELECT id INTO v_to_list_id FROM public.lists WHERE trello_id = p_list_to_trello_id;
    END IF;
    IF p_member_trello_id IS NOT NULL THEN
        SELECT id INTO v_member_id FROM public.members WHERE trello_id = p_member_trello_id;
    END IF;

    INSERT INTO public.card_events(
        trello_action_id, action_type, raw_action_type, card_id, board_id, list_from_id, list_to_id, member_id, occurred_at, payload_json
    ) VALUES (
        p_trello_action_id, p_action_type, p_action_type, v_card_id, v_board_id, v_from_list_id, v_to_list_id, v_member_id, COALESCE(p_occurred_at, NOW()), p_payload_json
    ) ON CONFLICT (trello_action_id) DO UPDATE SET
        action_type = EXCLUDED.action_type,
        raw_action_type = EXCLUDED.raw_action_type,
        card_id = COALESCE(EXCLUDED.card_id, public.card_events.card_id),
        board_id = COALESCE(EXCLUDED.board_id, public.card_events.board_id),
        list_from_id = COALESCE(EXCLUDED.list_from_id, public.card_events.list_from_id),
        list_to_id = COALESCE(EXCLUDED.list_to_id, public.card_events.list_to_id),
        member_id = COALESCE(EXCLUDED.member_id, public.card_events.member_id),
        occurred_at = EXCLUDED.occurred_at,
        payload_json = EXCLUDED.payload_json
    RETURNING id INTO v_id;

    -- Se for uma criação e a tabela cards tiver coluna created_by_member_id, tentar preencher quando possível
    IF p_action_type = 'createCard' AND v_card_id IS NOT NULL AND v_member_id IS NOT NULL THEN
        BEGIN
            UPDATE public.cards
            SET created_by_member_id = COALESCE(created_by_member_id, v_member_id)
            WHERE id = v_card_id;
        EXCEPTION WHEN undefined_column THEN
            -- Ignora se a coluna não existir neste schema
            NULL;
        END;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_record_webhook_event(
    p_board_trello_id TEXT,
    p_trello_action_id TEXT,
    p_action_type TEXT,
    p_payload JSONB
) RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
    v_board_id UUID;
BEGIN
    IF p_board_trello_id IS NOT NULL THEN
        SELECT id INTO v_board_id FROM public.boards WHERE trello_id = p_board_trello_id;
    END IF;

    INSERT INTO public.webhook_events(board_id, trello_action_id, action_type, payload)
    VALUES (v_board_id, p_trello_action_id, p_action_type, p_payload)
    ON CONFLICT (trello_action_id) DO NOTHING
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


