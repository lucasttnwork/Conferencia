import { supabaseSelect } from './lib/http';
import fetch from 'node-fetch';

interface Card {
  id: string;
  trello_id: string;
  name: string;
  protocol_number: string | null;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as OpenAIResponse;
  return data.choices[0].message.content.trim();
}

async function extractProtocolNumber(cardName: string): Promise<string | null> {
  const systemPrompt = `Você é um assistente especializado em extrair números de protocolo de documentos notariais.
  
  REGRAS IMPORTANTES:
  1. Procure por números de protocolo que podem estar em diferentes formatos:
     - Protocolo [321400] → 321400
     - Protocolo -318943 → 318943
     - Protocolo - (321067) → 321067
     - Protocolo 320530 → 320530
     - Protocolo [293.324] → 293324 (remover pontos)
     - Protocolo (321465) → 321465
  
  2. Números de protocolo geralmente têm 6 dígitos, mas podem ter variações
  3. Se encontrar múltiplos números, escolha o que parece ser o número de protocolo principal
  4. Remova pontos, hífens e espaços extras dos números
  5. Se não encontrar um número de protocolo claro, responda apenas "NENHUM"
  
  Nome do card: "${cardName}"
  
  Responda apenas com o número de protocolo encontrado (sem formatação) ou "NENHUM" se não encontrar.`;

  try {
    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extraia o número de protocolo deste nome: "${cardName}"` }
    ]);

    // Limpar a resposta e verificar se é válida
    const cleanResponse = response.trim();
    
    if (cleanResponse === 'NENHUM' || cleanResponse === '') {
      return null;
    }

    // Remover caracteres não numéricos e verificar se é um número válido
    const protocolNumber = cleanResponse.replace(/[^\d]/g, '');
    
    if (protocolNumber.length >= 4 && protocolNumber.length <= 8) {
      return protocolNumber;
    }

    return null;
  } catch (error) {
    console.error(`❌ Erro ao extrair protocolo: ${error}`);
    return null;
  }
}

async function getCardsWithoutProtocol(): Promise<Card[]> {
  const cards = await supabaseSelect<Card[]>(
    'cards',
    'select=id,trello_id,name,protocol_number&protocol_number=is.null&name=not.is.null'
  );
  return cards;
}

async function updateCardProtocol(cardId: string, protocolNumber: string): Promise<void> {
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`);
  
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      protocol_number: protocolNumber,
      updated_at: new Date().toISOString()
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase PATCH cards -> ${response.status} ${await response.text()}`);
  }
}

async function main() {
  console.log('🔍 Buscando cards sem número de protocolo...');
  
  const cards = await getCardsWithoutProtocol();
  console.log(`📋 Encontrados ${cards.length} cards para processar`);

  let processed = 0;
  let extracted = 0;
  let errors = 0;

  for (const card of cards) {
    try {
      console.log(`\n📝 Processando: "${card.name}"`);
      
      const protocolNumber = await extractProtocolNumber(card.name);
      
      if (protocolNumber) {
        await updateCardProtocol(card.id, protocolNumber);
        console.log(`✅ Protocolo extraído: ${protocolNumber}`);
        extracted++;
      } else {
        console.log(`❌ Nenhum protocolo encontrado`);
      }
      
      processed++;
      
      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Erro ao processar card "${card.name}":`, error);
      errors++;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`- Cards processados: ${processed}`);
  console.log(`- Protocolos extraídos: ${extracted}`);
  console.log(`- Erros: ${errors}`);
}

if (require.main === module) {
  main().catch(console.error);
} 