
import { NextResponse } from 'next/server';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;
const TRELLO_TRIAGEM_LIST_ID = process.env.TRELLO_TRIAGEM_LIST_ID || '6866abc12d1dd317b1f980b0';
const TRELLO_IMPRESSAO_LIST_ID = process.env.TRELLO_IMPRESSAO_LIST_ID;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tipoAto, protocolo, extras, escrevente, equipe, listType } = body;

        // 1. Validation
        if (!tipoAto || !protocolo || !escrevente) {
            return NextResponse.json(
                { error: 'Campos obrigatórios faltando.' },
                { status: 400 }
            );
        }

        // 2. Formatting
        const createdAt = new Date();
        const createdAtLocalized = createdAt.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        });
        const cardName = `📌 ${tipoAto} – Protocolo ${protocolo}`;
        const description = `[${escrevente}] - Equipe: [${equipe || 'N/A'}]

Criado automaticamente em: ${createdAtLocalized}
    
Informações Extras:
${extras || 'Nenhuma'}`;

        // Determine List ID based on List Type
        let targetListId = TRELLO_TRIAGEM_LIST_ID;
        if (listType === 'impressao') {
            if (!TRELLO_IMPRESSAO_LIST_ID || TRELLO_IMPRESSAO_LIST_ID === 'PLACEHOLDER_CHANGE_ME') {
                console.error('TRELLO_IMPRESSAO_LIST_ID not configured');
                return NextResponse.json(
                    { error: 'Configuração de lista de impressão ausente.' },
                    { status: 500 }
                );
            }
            targetListId = TRELLO_IMPRESSAO_LIST_ID;
        }

        // 3. Trello API Call
        const url = `https://api.trello.com/1/cards?idList=${targetListId}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&name=${encodeURIComponent(cardName)}&desc=${encodeURIComponent(description)}&pos=bottom`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Trello API Error:', errorText);
            return NextResponse.json(
                { error: 'Falha ao criar card no Trello.' },
                { status: 500 }
            );
        }

        const data = await response.json();

        return NextResponse.json({ success: true, cardId: data.id });

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { error: 'Erro interno no servidor.' },
            { status: 500 }
        );
    }
}
