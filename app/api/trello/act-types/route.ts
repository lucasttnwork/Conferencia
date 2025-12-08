
import { NextResponse } from 'next/server';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const MODELS_LIST_ID = process.env.TRELLO_MODELS_LIST_ID || '67e44ff774af21759836b4cc';

export async function GET() {
    try {
        const url = `https://api.trello.com/1/lists/${MODELS_LIST_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cards from Trello');
        }

        const cards = await response.json();

        // Regex to extract the name between "📌 " and " –"
        // Pattern: Starts with "📌 " (optional), captures content until " –" (en dash) or " - " (hyphen)
        const actTypes = cards
            .map((card: any) => {
                const match = card.name.match(/📌\s*(.*?)\s*[–-]/);
                return match ? match[1].trim() : null;
            })
            .filter((name: string | null) => name !== null)
            // Remove duplicates
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
            .sort();

        return NextResponse.json({ actTypes });

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar tipos de atos.' },
            { status: 500 }
        );
    }
}
