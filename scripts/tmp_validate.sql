\timing on
SELECT 'boards' tbl, COUNT(*) FROM public.boards;
SELECT 'members' tbl, COUNT(*) FROM public.members;
SELECT 'board_members' tbl, COUNT(*) FROM public.board_members;
SELECT 'lists' tbl, COUNT(*) FROM public.lists;
SELECT 'labels' tbl, COUNT(*) FROM public.labels;
SELECT 'cards' tbl, COUNT(*) FROM public.cards;
SELECT 'card_labels' tbl, COUNT(*) FROM public.card_labels;
SELECT 'card_members' tbl, COUNT(*) FROM public.card_members;
SELECT 'card_movements' tbl, COUNT(*) FROM public.card_movements;
SELECT 'card_events' tbl, COUNT(*) FROM public.card_events;
SELECT 'webhook_events' tbl, COUNT(*) FROM public.webhook_events;
SELECT c.trello_id as card_tid, l.trello_id as list_tid, b.trello_id as board_tid
		 FROM public.cards c LEFT JOIN public.lists l ON c.current_list_id = l.id
		 JOIN public.boards b ON c.board_id = b.id
		 ORDER BY c.created_at DESC NULLS LAST LIMIT 5;