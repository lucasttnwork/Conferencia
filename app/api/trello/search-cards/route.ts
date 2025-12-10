import { NextResponse } from 'next/server';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

type TrelloCard = {
    id: string;
    name: string;
    idList: string;
    shortUrl?: string;
    dateLastActivity?: string;
    idBoard?: string;
};

type TrelloList = {
    id: string;
    name: string;
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
        const protocolo = searchParams.get('protocolo')?.trim();

        if (!protocolo) {
            return NextResponse.json(
                { error: 'Informe o número de protocolo.' },
                { status: 400 }
            );
        }

        if (!TRELLO_BOARD_ID) {
            return NextResponse.json(
                { error: 'Configuração TRELLO_BOARD_ID ausente.' },
                { status: 500 }
            );
        }

        // Sanitiza o protocolo para evitar caracteres especiais
        const queryTerm = protocolo.replace(/[^\w\s-]/g, '');

        const searchUrl = new URL('https://api.trello.com/1/search');
        searchUrl.searchParams.set('query', queryTerm);
        searchUrl.searchParams.set('idBoards', TRELLO_BOARD_ID);
        searchUrl.searchParams.set('modelTypes', 'cards');
        searchUrl.searchParams.set('cards_limit', '20');
        searchUrl.searchParams.set('card_fields', 'name,idList,shortUrl,dateLastActivity,idBoard');
        searchUrl.searchParams.set('key', TRELLO_API_KEY);
        searchUrl.searchParams.set('token', TRELLO_API_TOKEN);

        const listsUrl = new URL(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists`);
        listsUrl.searchParams.set('cards', 'none');
        listsUrl.searchParams.set('fields', 'name');
        listsUrl.searchParams.set('key', TRELLO_API_KEY);
        listsUrl.searchParams.set('token', TRELLO_API_TOKEN);

        const [cardsResponse, listsResponse] = await Promise.all([
            fetch(searchUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } }),
            fetch(listsUrl.toString(), { method: 'GET', headers: { Accept: 'application/json' } })
        ]);

        if (!cardsResponse.ok) {
            const errorText = await cardsResponse.text();
            console.error('[Trello] Erro na busca de cards:', errorText);
            return NextResponse.json(
                { error: 'Falha ao buscar cards no Trello.' },
                { status: 500 }
            );
        }

        if (!listsResponse.ok) {
            const errorText = await listsResponse.text();
            console.error('[Trello] Erro ao buscar listas:', errorText);
            return NextResponse.json(
                { error: 'Falha ao buscar listas no Trello.' },
                { status: 500 }
            );
        }

        const searchPayload = await cardsResponse.json();
        const listsPayload: TrelloList[] = await listsResponse.json();

        const listsMap = new Map<string, string>(
            listsPayload.map((list) => [list.id, list.name])
        );

        const cards: TrelloCard[] = (searchPayload?.cards || []).filter((card: TrelloCard) =>
            card?.name?.toLowerCase().includes(queryTerm.toLowerCase())
        );

        const formattedCards = cards.map((card) => ({
            id: card.id,
            name: card.name,
            idList: card.idList,
            listName: listsMap.get(card.idList) || 'Lista desconhecida',
            shortUrl: card.shortUrl,
            dateLastActivity: card.dateLastActivity,
            idBoard: card.idBoard,
        }));

        return NextResponse.json({ cards: formattedCards });
    } catch (error) {
        console.error('[Trello] Erro interno ao buscar cards:', error);
        return NextResponse.json(
            { error: 'Erro interno ao buscar cards.' },
            { status: 500 }
        );
    }
}
