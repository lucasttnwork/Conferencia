import { supabaseSelect } from './lib/http';
import { env } from './lib/env';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

interface Card {
  id: string;
  name: string;
  description: string | null;
  act_type: string | null;
}

// Interface removida - não é mais necessária

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

// Interface removida - não é mais necessária

// Carregar modelos de cards limpos
const CARD_MODELS_PATH = path.join(__dirname, 'card_models_clean.json');
const cardModels: string[] = JSON.parse(fs.readFileSync(CARD_MODELS_PATH, 'utf8'));

// Configurações de processamento paralelo - OTIMIZADAS para volumes maiores
const BATCH_SIZE = 100; // Processar 100 cards simultaneamente (aumentado para maior eficiência)
const MAX_CONCURRENT_REQUESTS = 15; // Máximo de 15 requests simultâneos para OpenAI (aumentado)
const DELAY_BETWEEN_BATCHES = 500; // 0.5 segundos entre lotes (reduzido para maior velocidade)

const OPENAI_API_KEY = env.OPENAI_API_KEY;

// Função para normalização OBRIGATÓRIA da natureza do ato via IA - OTIMIZADA
async function normalizeActTypeWithAI(cardName: string, description: string): Promise<string> {
  try {
    const systemPrompt = `Você é um especialista em normalização de tipos de atos notariais.

TAREFA OBRIGATÓRIA: Analise o nome de um card e identifique qual dos tipos padrão de atos notariais ele representa.

TIPOS PADRÃO DISPONÍVEIS (use EXATAMENTE um destes nomes):
${cardModels.map((model, index) => `${index + 1}. "${model}"`).join('\n')}

REGRAS CRÍTICAS:
1. Analise o NOME do card (principal) e a DESCRIÇÃO (auxiliar)
2. Identifique o tipo de ato mais apropriado da lista acima
3. Considere variações de nomenclatura, sinônimos e abreviações
4. Responda APENAS com o nome EXATO do tipo padrão (entre aspas)
5. NUNCA responda com números ou "NÃO IDENTIFICADO"
6. SEMPRE encontre uma correspondência, mesmo que seja a mais próxima

EXEMPLOS DE NORMALIZAÇÃO:
- "📌 Escritura de Venda e Compra – Protocolo 321400" → "Escritura de Venda e Compra"
- "📌 Procuração – Protocolo 321343" → "Procuração"
- "📌 Escritura de Inventário e Partilha -Protocolo 325536" → "Escritura de Inventário e Partilha"
- "📌 Venda e Compra - Protocolo 123" → "Escritura de Venda e Compra"
- "📌 Procuração Pública" → "Procuração"
- "📌 Inventário" → "Escritura de Inventário"

NOME DO CARD: "${cardName}"
DESCRIÇÃO: "${description}"

Responda APENAS com o nome exato do tipo padrão (entre aspas):`;

    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Normalize o tipo de ato para: "${cardName}"` }
    ]);

    const cleanResponse = response.trim().replace(/^["']|["']$/g, ''); // Remove aspas se existirem
    
    // Verificar se a resposta corresponde a um dos modelos
    if (cardModels.includes(cleanResponse)) {
      return cleanResponse;
    }
    
    // Se não corresponder exatamente, tentar encontrar a melhor correspondência
    const bestMatch = findBestMatch(cleanResponse);
    if (bestMatch) {
      console.log(`🔄 Normalização ajustada: "${cleanResponse}" → "${bestMatch}"`);
      return bestMatch;
    }
    
    // Último recurso: usar o fallback local
    console.log(`⚠️ IA não conseguiu normalizar, usando fallback local para: ${cardName}`);
    return normalizeActTypeLocal(cardName, description) || cardModels[0]; // Garantir que sempre retorne algo
  } catch (error) {
    console.error('❌ Erro ao normalizar tipo de ato via IA:', error);
    console.log(`🔄 Usando fallback local para: ${cardName}`);
    return normalizeActTypeLocal(cardName, description) || cardModels[0]; // Garantir que sempre retorne algo
  }
}

// Função para encontrar a melhor correspondência entre a resposta da IA e os modelos
function findBestMatch(aiResponse: string): string | null {
  const cleanResponse = aiResponse.toLowerCase().trim();
  
  // Buscar correspondências exatas ou muito similares
  for (const model of cardModels) {
    const cleanModel = model.toLowerCase().trim();
    
    // Correspondência exata
    if (cleanResponse === cleanModel) {
      return model;
    }
    
    // Correspondência com palavras-chave principais
    const responseWords = cleanResponse.split(/\s+/).filter(word => word.length > 3);
    const modelWords = cleanModel.split(/\s+/).filter(word => word.length > 3);
    
    let matchCount = 0;
    for (const responseWord of responseWords) {
      if (modelWords.includes(responseWord)) {
        matchCount++;
      }
    }
    
    const score = matchCount / Math.max(responseWords.length, modelWords.length);
    
    if (score > 0.6) { // Threshold de 60% para correspondência
      return model;
    }
  }
  
  return null;
}

// Função para normalização local (fallback melhorado)
function normalizeActTypeLocal(cardName: string, description: string): string {
  // Limpar o nome do card removendo protocolo e números
  const cleanCardName = cardName
    .replace(/📌\s*/g, '')
    .replace(/Protocolo\s*[\[\(]?[\d\.\s\-]+[\]\)]?/gi, '')
    .replace(/numero\s*[\[\(]?[\d\.\s\-]+[\]\)]?/gi, '')
    .replace(/–\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Buscar o modelo mais similar
  let bestMatch = '';
  let bestScore = 0;

  for (const model of cardModels) {
    const cleanModel = model
      .replace(/\s+/g, ' ')
      .trim();

    // Calcular similaridade baseada em palavras-chave
    const cardWords = cleanCardName.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const modelWords = cleanModel.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    let matchCount = 0;
    for (const cardWord of cardWords) {
      if (modelWords.includes(cardWord)) {
        matchCount++;
      }
    }
    
    const score = matchCount / Math.max(cardWords.length, modelWords.length);
    
    if (score > bestScore && score > 0.4) { // Threshold reduzido para 40% para maior cobertura
      bestScore = score;
      bestMatch = model;
    }
  }

  return bestMatch || cardModels[0]; // Sempre retorna um modelo válido
}

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
      max_tokens: 100, // Reduzido - apenas para normalização
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as OpenAIResponse;
  return data.choices[0].message.content.trim();
}

// Função removida - não é mais necessária para normalização apenas do tipo de ato

// Função removida - não é mais necessária, usamos apenas dados do Supabase

// Função para buscar cards sem paginação - apenas para contar total
async function getTotalCardsCount(): Promise<number> {
  console.log('🔍 Contando total de cards disponíveis...');
  
  let totalCount = 0;
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    try {
      const cards = await supabaseSelect<Card[]>(
        'cards',
        `select=id&description=not.is.null&limit=${limit}&offset=${offset}`
      );
      
      if (cards.length === 0) {
        break; // Não há mais cards
      }
      
      totalCount += cards.length;
      console.log(`📊 Offset ${offset}: ${cards.length} cards encontrados (Total acumulado: ${totalCount})`);
      
      if (cards.length < limit) {
        break; // Última página
      }
      
      offset += limit;
    } catch (error) {
      console.error(`❌ Erro ao contar cards no offset ${offset}:`, error);
      break;
    }
  }
  
  console.log(`📊 Total final de cards disponíveis: ${totalCount}\n`);
  return totalCount;
}

// Função para buscar cards com paginação - incluindo todos os cards que precisam ser normalizados
async function getCardsWithoutInfoPaginated(offset: number, limit: number): Promise<Card[]> {
  const cards = await supabaseSelect<Card[]>(
    'cards',
    `select=id,name,description,act_type&description=not.is.null&limit=${limit}&offset=${offset}&order=id.asc`
  );
  return cards;
}

// Função para buscar todos os cards sem paginação (mantida para compatibilidade)
async function getCardsWithoutInfo(): Promise<Card[]> {
  const cards = await supabaseSelect<Card[]>(
    'cards',
    'select=id,name,description,act_type&description=not.is.null&limit=1000'
  );
  return cards;
}

// Função para verificar se um act_type está no padrão desejado
function isActTypeStandard(actType: string | null): boolean {
  if (!actType) return false;
  return cardModels.includes(actType.trim());
}

async function updateCardInfo(cardId: string, actType: string): Promise<void> {
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
      act_type: actType, // Apenas o tipo de ato normalizado
      updated_at: new Date().toISOString()
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase PATCH cards -> ${response.status} ${await response.text()}`);
  }
}

// Função para processar um card individual - SIMPLIFICADA para apenas normalização
async function processCard(card: Card): Promise<{ success: boolean; extracted: boolean; error?: string; actType?: string; needsUpdate: boolean }> {
  try {
    // Usar dados diretamente do Supabase (sem consultar Trello)
    if (!card.description || card.description.trim() === '') {
      console.log(`⚠️ Card ${card.name.substring(0, 50)}... - Sem descrição`);
      return { success: true, extracted: false, needsUpdate: false };
    }
    
    // Verificar se o act_type atual está no padrão
    const currentActType = card.act_type;
    const isStandard = isActTypeStandard(currentActType);
    
    if (isStandard) {
      console.log(`✅ Card ${card.name.substring(0, 50)}... - Já está padronizado (${currentActType})`);
      return { success: true, extracted: true, actType: currentActType || undefined, needsUpdate: false };
    }
    
    // NORMALIZAÇÃO OBRIGATÓRIA via IA - apenas tipo de ato
    if (currentActType) {
      console.log(`🔄 Card ${card.name.substring(0, 50)}... - Normalizando tipo fora do padrão: "${currentActType}"`);
    } else {
      console.log(`🔍 Card ${card.name.substring(0, 50)}... - Normalizando tipo de ato (sem valor atual)`);
    }
    
    const normalizedActType = await normalizeActTypeWithAI(card.name, card.description);
    console.log(`✅ Tipo normalizado: "${normalizedActType}"`);
    
    // Verificar se precisa atualizar
    const needsUpdate = !isStandard || currentActType !== normalizedActType;
    
    if (needsUpdate) {
      // Atualizar apenas o tipo de ato no banco
      await updateCardInfo(card.id, normalizedActType);
      console.log(`💾 Atualizado no banco: "${currentActType || 'null'}" → "${normalizedActType}"`);
    }
    
    return { 
      success: true, 
      extracted: true, 
      actType: normalizedActType,
      needsUpdate: needsUpdate
    };
    
  } catch (error) {
    console.error(`❌ Erro ao processar card ${card.name}:`, error);
    return { 
      success: false, 
      extracted: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      needsUpdate: false
    };
  }
}

// Função para processar um lote de cards em paralelo
async function processBatch(cards: Card[]): Promise<{ processed: number; extracted: number; errors: number; updated: number }> {
  const semaphore = new Array(MAX_CONCURRENT_REQUESTS).fill(null);
  let processed = 0;
  let extracted = 0;
  let errors = 0;
  let updated = 0;

  const processWithSemaphore = async (card: Card): Promise<void> => {
    const semaphoreIndex = semaphore.findIndex(s => s === null);
    semaphore[semaphoreIndex] = card.id;
    
    try {
      const result = await processCard(card);
      processed++;
      if (result.extracted) extracted++;
      if (!result.success) errors++;
      if (result.needsUpdate) updated++;
      
      // Logs já são feitos na função processCard
    } finally {
      semaphore[semaphoreIndex] = null;
    }
  };

  // Processar todos os cards do lote em paralelo
  const promises = cards.map(processWithSemaphore);
  await Promise.all(promises);

  return { processed, extracted, errors, updated };
}

async function main() {
  let totalProcessed = 0;
  let totalExtracted = 0;
  let totalErrors = 0;
  let totalUpdated = 0;
  let batchNumber = 1;
  let offset = 0;
  const PAGE_SIZE = 1000; // Tamanho da página para paginação (aumentado para processar mais cards por vez)
  
  console.log('🚀 Iniciando NORMALIZAÇÃO EM MASSA de tipos de atos via IA...');
  console.log(`📋 Modelos de cards carregados: ${cardModels.length}`);
  console.log(`🔍 FOCO: Normalização e padronização de tipos de ato (dados do Supabase)`);
  console.log(`⚡ Processamento em lotes de ${BATCH_SIZE} cards simultaneamente`);
  console.log(`🔄 Máximo de ${MAX_CONCURRENT_REQUESTS} requests simultâneos para OpenAI`);
  console.log(`📊 Paginação: ${PAGE_SIZE} cards por página\n`);
  
  // Primeiro, verificar o total de cards disponíveis
  console.log('🔍 Verificando total de cards disponíveis para normalização...');
  const totalCardsAvailable = await getTotalCardsCount();
  console.log(`📊 Total de cards disponíveis: ${totalCardsAvailable}\n`);
  
  if (totalCardsAvailable === 0) {
    console.log('✅ Todos os cards já foram normalizados! Não há mais cards pendentes.');
    return;
  }
  
  while (offset < totalCardsAvailable) {
    console.log(`\n🔄 LOTE ${batchNumber} - Buscando página de cards (offset: ${offset}, limite: ${PAGE_SIZE})...`);
    
    const cards = await getCardsWithoutInfoPaginated(offset, PAGE_SIZE);
    
    if (cards.length === 0) {
      console.log('✅ Todos os cards foram processados! Não há mais cards pendentes.');
      break;
    }
    
    console.log(`📋 Encontrados ${cards.length} cards para processar nesta página`);
    
    // Processar TODOS os cards da página em lotes para controle de concorrência
    let pageOffset = 0;
    let pageProcessed = 0;
    
    while (pageOffset < cards.length) {
      const batchCards = cards.slice(pageOffset, pageOffset + BATCH_SIZE);
      console.log(`🔧 Processando lote ${Math.floor(pageOffset / BATCH_SIZE) + 1} da página ${batchNumber} (${batchCards.length} cards)...`);
      
      const batchResult = await processBatch(batchCards);
      
      // Atualizar contadores da página
      pageProcessed += batchResult.processed;
      
      // Atualizar contadores totais
      totalProcessed += batchResult.processed;
      totalExtracted += batchResult.extracted;
      totalErrors += batchResult.errors;
      totalUpdated += batchResult.updated;
      
      console.log(`📊 Resumo do Lote ${Math.floor(pageOffset / BATCH_SIZE) + 1} da Página ${batchNumber}:`);
      console.log(`- Cards processados: ${batchResult.processed}`);
      console.log(`- Cards normalizados: ${batchResult.extracted}`);
      console.log(`- Cards atualizados: ${batchResult.updated}`);
      console.log(`- Erros: ${batchResult.errors}`);
      
      pageOffset += BATCH_SIZE;
      
      // Pausa entre lotes da mesma página
      if (pageOffset < cards.length) {
        console.log(`⏳ Aguardando ${DELAY_BETWEEN_BATCHES/1000} segundos antes do próximo lote da página...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`\n📊 Resumo da Página ${batchNumber}:`);
    console.log(`- Total de cards na página: ${cards.length}`);
    console.log(`- Total processado na página: ${pageProcessed}`);
    
    console.log(`\n📈 Progresso Total:`);
    console.log(`- Total processado: ${totalProcessed}`);
    console.log(`- Total normalizado: ${totalExtracted}`);
    console.log(`- Total atualizado: ${totalUpdated}`);
    console.log(`- Total de erros: ${totalErrors}`);
    console.log(`- Progresso: ${((totalProcessed / totalCardsAvailable) * 100).toFixed(1)}% (${totalProcessed}/${totalCardsAvailable})`);
    
    batchNumber++;
    offset += PAGE_SIZE; // Avançar para a próxima página
    
    // Pausa entre páginas para não sobrecarregar as APIs
    console.log(`\n⏳ Aguardando ${DELAY_BETWEEN_BATCHES/1000} segundos antes da próxima página...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }

  console.log(`\n🎉 NORMALIZAÇÃO EM MASSA COMPLETA!`);
  console.log(`📊 Resumo Final:`);
  console.log(`- Total de cards disponíveis: ${totalCardsAvailable}`);
  console.log(`- Total de cards processados: ${totalProcessed}`);
  console.log(`- Total de tipos de atos normalizados: ${totalExtracted}`);
  console.log(`- Total de cards atualizados: ${totalUpdated}`);
  console.log(`- Total de erros: ${totalErrors}`);
  console.log(`- Lotes processados: ${batchNumber - 1}`);
  console.log(`- Taxa de sucesso na normalização: ${((totalExtracted / totalProcessed) * 100).toFixed(1)}%`);
  console.log(`- Cards por lote: ${BATCH_SIZE}`);
  console.log(`- Cards por página: ${PAGE_SIZE}`);
  console.log(`- Requests simultâneos: ${MAX_CONCURRENT_REQUESTS}`);
}

if (require.main === module) {
  main().catch(console.error);
}
