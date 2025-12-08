
import { NextResponse } from 'next/server';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;
const TRIAGEM_LIST_ID = process.env.TRELLO_TRIAGEM_LIST_ID || '6866abc12d1dd317b1f980b0';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tipoAto, protocolo, dataEntrega, extras } = body;

        // 1. Validation
        if (!tipoAto || !protocolo || !dataEntrega) {
            return NextResponse.json(
                { error: 'Campos obrigatórios faltando.' },
                { status: 400 }
            );
        }

        const deliveryDate = new Date(dataEntrega);
        // Normalize to midnight
        deliveryDate.setUTCHours(0, 0, 0, 0);

        const now = new Date();
        const minDate = new Date();
        minDate.setDate(now.getDate() + 2);
        minDate.setUTCHours(0, 0, 0, 0);

        // Remove time components for pure date comparison
        const deliveryTime = deliveryDate.getTime();
        const minTime = minDate.getTime();

        if (deliveryTime < minTime) {
            return NextResponse.json(
                { error: 'A data de entrega deve ser de no mínimo 48 horas (2 dias) a partir de hoje.' },
                { status: 400 }
            );
        }

        // 2. Formatting
        const cardName = `📌 ${tipoAto} – ${protocolo}`;
        const description = `Data para Entrega: ${deliveryDate.toLocaleString('pt-BR')}
    
Informações Extras:
${extras || 'Nenhuma'}`;

        // 3. Trello API Call
        const url = `https://api.trello.com/1/cards?idList=${TRIAGEM_LIST_ID}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&name=${encodeURIComponent(cardName)}&desc=${encodeURIComponent(description)}&pos=top`;

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
