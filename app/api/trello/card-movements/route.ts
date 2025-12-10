import { NextResponse } from 'next/server';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;

type TrelloAction = {
    id: string;
    type: string;
    date: string;
    data?: any;
    memberCreator?: {
        id?: string;
        username?: string;
        fullName?: string;
    };
};

export async function GET(request: Request) {
    try {
        if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
            return NextResponse.json(
                { error: 'Configurações do Trello ausentes (TRELLO_API_KEY/TRELLO_API_TOKEN).' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const cardId = searchParams.get('cardId')?.trim();

        if (!cardId) {
            return NextResponse.json(
                { error: 'Informe o ID do card.' },
                { status: 400 }
            );
        }

        // Detalhes do card (inclui lista atual)
        const cardUrl = new URL(`https://api.trello.com/1/cards/${cardId}`);
        cardUrl.searchParams.set('fields', 'name,idList,shortUrl,dateLastActivity,idBoard');
        cardUrl.searchParams.set('list', 'true');
        cardUrl.searchParams.set('list_fields', 'name');
        cardUrl.searchParams.set('key', TRELLO_API_KEY);
        cardUrl.searchParams.set('token', TRELLO_API_TOKEN);

        // Ações do card (criação, cópia e movimentações entre listas)
        const actionsUrl = new URL(`https://api.trello.com/1/cards/${cardId}/actions`);
        actionsUrl.searchParams.set('filter', 'createCard,copyCard,updateCard:idList');
        actionsUrl.searchParams.set('fields', 'id,type,date,data,memberCreator');
        actionsUrl.searchParams.set('limit', '1000');
        actionsUrl.searchParams.set('key', TRELLO_API_KEY);
        actionsUrl.searchParams.set('token', TRELLO_API_TOKEN);

        const [cardResponse, actionsResponse] = await Promise.all([
            fetch(cardUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } }),
            fetch(actionsUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } })
        ]);

        if (!cardResponse.ok) {
            const errorText = await cardResponse.text();
            console.error('[Trello] Erro ao buscar card:', errorText);
            return NextResponse.json(
                { error: 'Falha ao buscar detalhes do card.' },
                { status: 500 }
            );
        }

        if (!actionsResponse.ok) {
            const errorText = await actionsResponse.text();
            console.error('[Trello] Erro ao buscar ações do card:', errorText);
            return NextResponse.json(
                { error: 'Falha ao buscar movimentações do card.' },
                { status: 500 }
            );
        }

        const cardData = await cardResponse.json();
        const actions: TrelloAction[] = await actionsResponse.json();

        // Função utilitária: extrair data de criação a partir do ID do card (primeiros 8 hex = epoch seconds)
        const trelloIdToDateIso = (id: string): string | null => {
            try {
                const tsHex = id.substring(0, 8);
                const seconds = parseInt(tsHex, 16);
                if (Number.isNaN(seconds)) return null;
                return new Date(seconds * 1000).toISOString();
            } catch {
                return null;
            }
        };

        const creationAction =
            actions.find((a) => a.type === 'createCard') ||
            actions.find((a) => a.type === 'copyCard');

        const creationDateIso =
            creationAction?.date ||
            trelloIdToDateIso(cardId) ||
            cardData.dateLastActivity ||
            null;

        // Garantir que a primeira entrada sempre represente a criação do card (real ou inferida)
        const creationEvents = (() => {
            if (creationAction) {
                const toList = creationAction.data?.list || creationAction.data?.listAfter || null;
                return [
                    {
                        id: creationAction.id,
                        type: 'create' as const,
                        date: creationAction.date,
                        toListId: toList?.id || null,
                        toListName: toList?.name || 'Lista desconhecida',
                        memberName: creationAction.memberCreator?.fullName || creationAction.memberCreator?.username || '—',
                    },
                ];
            }
            // Fallback: sem ação de criação; inferir lista inicial como a lista de origem do primeiro movimento
            const inferredListName =
                actions
                    .filter((a) => a.type === 'updateCard' && a.data?.listBefore)
                    .map((a) => a.data.listBefore.name)
                    .find(Boolean) ||
                cardData.list?.name ||
                'Lista desconhecida';

            if (creationDateIso) {
                return [
                    {
                        id: `synthetic-${cardId}`,
                        type: 'create' as const,
                        date: creationDateIso,
                        toListId: null,
                        toListName: inferredListName,
                        memberName: '—',
                    },
                ];
            }

            return [];
        })().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const moveEvents = actions
            .filter((action) => action.type === 'updateCard' && action.data?.listBefore && action.data?.listAfter)
            .map((action) => ({
                id: action.id,
                type: 'move' as const,
                date: action.date,
                fromListId: action.data.listBefore.id,
                fromListName: action.data.listBefore.name || 'Lista anterior',
                toListId: action.data.listAfter.id,
                toListName: action.data.listAfter.name || 'Lista destino',
                memberName: action.memberCreator?.fullName || action.memberCreator?.username || '—',
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Timeline final: criação (real ou inferida) sempre como primeiro ponto, seguida das movimentações
        const timeline = [
            ...(creationEvents.length > 0 ? [creationEvents[0]] : []),
            ...moveEvents,
        ];

        return NextResponse.json({
            card: {
                id: cardData.id,
                name: cardData.name,
                listId: cardData.idList,
                listName: cardData.list?.name || null,
                shortUrl: cardData.shortUrl,
                dateLastActivity: cardData.dateLastActivity,
                idBoard: cardData.idBoard,
            },
            timeline,
        });
    } catch (error) {
        console.error('[Trello] Erro interno ao buscar movimentações:', error);
        return NextResponse.json(
            { error: 'Erro interno ao buscar movimentações.' },
            { status: 500 }
        );
    }
}
