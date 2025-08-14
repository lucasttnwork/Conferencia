import { supabaseSelect } from './lib/http';
import { env } from './lib/env';
import fetch from 'node-fetch';

interface Card {
  id: string;
  trello_id: string;
  name: string;
  description: string | null;
  clerk_name: string | null;
  act_type: string | null;
  act_value: number | null;
  clerk_email: string | null;
  reconference: boolean | null;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
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

interface ExtractedInfo {
  clerk_name: string | null;
  act_type: string | null;
  act_value: number | null;
  clerk_email: string | null;
  reconference: boolean | null;
}

const OPENAI_API_KEY = env.OPENAI_API_KEY;

export async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
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
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as OpenAIResponse;
  return data.choices[0].message.content.trim();
}

async function extractCardInfo(cardName: string, description: string): Promise<ExtractedInfo> {
  const systemPrompt = `Você é um assistente especializado em extrair informações de documentos notariais a partir de descrições de cards do Trello.

  REGRAS IMPORTANTES:
  1. Analise a descrição do card e extraia as seguintes informações:
     - Escrevente: nome da pessoa responsável (campo: clerk_name)
     - Natureza: tipo do ato notarial (campo: act_type)
     - Valor: valor monetário em reais (campo: act_value) - converter para número, remover R$, pontos e vírgulas
     - E-mail: endereço de e-mail (campo: clerk_email)
     - Reconferência: se há necessidade de reconferência (campo: reconference) - responder "sim" ou "não"
  
  2. Para o valor monetário:
     - Remover R$, pontos, vírgulas e espaços
     - Converter para número decimal
     - Se não encontrar valor, retornar null
  
  3. Para reconferência:
     - Se encontrar "reconferência: sim" ou similar, retornar true
     - Se encontrar "reconferência: não" ou similar, retornar false
     - Se não encontrar informação, retornar null
  
  4. Responda em formato JSON válido com os campos:
     {
       "clerk_name": "string ou null",
       "act_type": "string ou null", 
       "act_value": "number ou null",
       "clerk_email": "string ou null",
       "reconference": "boolean ou null"
     }
  
  5. Se não encontrar uma informação, use null para esse campo
  6. Responda APENAS o JSON, sem texto adicional`;

  try {
    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extraia as informações deste card:\n\nNome: "${cardName}"\n\nDescrição: "${description}"` }
    ]);

    // Tentar fazer o parse do JSON retornado
    try {
      const extractedData = JSON.parse(response) as ExtractedInfo;
      
      // Validar e limpar os dados
      return {
        clerk_name: extractedData.clerk_name?.trim() || null,
        act_type: extractedData.act_type?.trim() || null,
        act_value: typeof extractedData.act_value === 'number' ? extractedData.act_value : null,
        clerk_email: extractedData.clerk_email?.trim() || null,
        reconference: typeof extractedData.reconference === 'boolean' ? extractedData.reconference : null
      };
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta da OpenAI:', parseError);
      console.error('Resposta recebida:', response);
      return {
        clerk_name: null,
        act_type: null,
        act_value: null,
        clerk_email: null,
        reconference: null
      };
    }
  } catch (error) {
    console.error(`❌ Erro ao chamar OpenAI: ${error}`);
    return {
      clerk_name: null,
      act_type: null,
      act_value: null,
      clerk_email: null,
      reconference: null
    };
  }
}

async function getTrelloCardInfo(trelloId: string): Promise<TrelloCard> {
  const url = `https://api.trello.com/1/cards/${trelloId}?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status} ${await response.text()}`);
  }
  
  return response.json() as Promise<TrelloCard>;
}

async function getCardsWithoutInfo(): Promise<Card[]> {
  const cards = await supabaseSelect<Card[]>(
    'cards',
    'select=id,trello_id,name,description,clerk_name,act_type,act_value,clerk_email,reconference&clerk_name=is.null&act_type=is.null&act_value=is.null&clerk_email=is.null&reconference=is.null&description=not.is.null'
  );
  return cards;
}

async function updateCardInfo(cardId: string, info: ExtractedInfo): Promise<void> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`);
  
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      clerk_name: info.clerk_name,
      act_type: info.act_type,
      act_value: info.act_value,
      clerk_email: info.clerk_email,
      reconference: info.reconference,
      updated_at: new Date().toISOString()
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase PATCH cards -> ${response.status} ${await response.text()}`);
  }
}

async function main() {
  let totalProcessed = 0;
  let totalExtracted = 0;
  let totalErrors = 0;
  let batchNumber = 1;
  
  console.log('🚀 Iniciando processamento completo de todos os cards pendentes...\n');
  
  while (true) {
    console.log(`\n🔄 LOTE ${batchNumber} - Buscando cards sem informações extraídas...`);
    
    const cards = await getCardsWithoutInfo();
    
    if (cards.length === 0) {
      console.log('✅ Todos os cards foram processados! Não há mais cards pendentes.');
      break;
    }
    
    console.log(`📋 Encontrados ${cards.length} cards para processar neste lote`);
    
    let batchProcessed = 0;
    let batchExtracted = 0;
    let batchErrors = 0;

    for (const card of cards) {
      try {
        console.log(`\n📝 Processando: "${card.name}"`);
        
        // Buscar informações atualizadas do Trello
        const trelloCard = await getTrelloCardInfo(card.trello_id);
        console.log(`📋 Descrição do Trello obtida (${trelloCard.desc.length} caracteres)`);
        
        if (!trelloCard.desc || trelloCard.desc.trim() === '') {
          console.log(`⚠️ Card sem descrição, pulando...`);
          continue;
        }
        
        // Extrair informações usando OpenAI
        const extractedInfo = await extractCardInfo(trelloCard.name, trelloCard.desc);
        
        // Verificar se extraiu alguma informação útil
        const hasInfo = extractedInfo.clerk_name || extractedInfo.act_type || 
                       extractedInfo.act_value || extractedInfo.clerk_email || 
                       extractedInfo.reconference !== null;
        
        if (hasInfo) {
          await updateCardInfo(card.id, extractedInfo);
          console.log(`✅ Informações extraídas:`);
          if (extractedInfo.clerk_name) console.log(`   👤 Escrevente: ${extractedInfo.clerk_name}`);
          if (extractedInfo.act_type) console.log(`   💼 Natureza: ${extractedInfo.act_type}`);
          if (extractedInfo.act_value) console.log(`   💰 Valor: R$ ${extractedInfo.act_value.toFixed(2)}`);
          if (extractedInfo.clerk_email) console.log(`   📧 E-mail: ${extractedInfo.clerk_email}`);
          if (extractedInfo.reconference !== null) console.log(`   🔍 Reconferência: ${extractedInfo.reconference ? 'Sim' : 'Não'}`);
          batchExtracted++;
        } else {
          console.log(`❌ Nenhuma informação útil extraída`);
        }
        
        batchProcessed++;
        
        // Pequena pausa para não sobrecarregar as APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erro ao processar card "${card.name}":`, error);
        batchErrors++;
      }
    }
    
    // Atualizar contadores totais
    totalProcessed += batchProcessed;
    totalExtracted += batchExtracted;
    totalErrors += batchErrors;
    
    console.log(`\n📊 Resumo do Lote ${batchNumber}:`);
    console.log(`- Cards processados: ${batchProcessed}`);
    console.log(`- Cards com informações extraídas: ${batchExtracted}`);
    console.log(`- Erros: ${batchErrors}`);
    console.log(`\n📈 Progresso Total:`);
    console.log(`- Total processado: ${totalProcessed}`);
    console.log(`- Total extraído: ${totalExtracted}`);
    console.log(`- Total de erros: ${totalErrors}`);
    
    batchNumber++;
    
    // Pequena pausa entre lotes para verificar se há novos cards
    if (cards.length > 0) {
      console.log('\n⏳ Aguardando 3 segundos antes do próximo lote...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n🎉 PROCESSAMENTO COMPLETO FINALIZADO!`);
  console.log(`📊 Resumo Final:`);
  console.log(`- Total de cards processados: ${totalProcessed}`);
  console.log(`- Total de cards com informações extraídas: ${totalExtracted}`);
  console.log(`- Total de erros: ${totalErrors}`);
  console.log(`- Lotes processados: ${batchNumber - 1}`);
}

if (require.main === module) {
  main().catch(console.error);
}
