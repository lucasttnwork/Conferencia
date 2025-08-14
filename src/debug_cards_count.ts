import { supabaseSelect } from './lib/http';
import { env } from './lib/env';
import fetch from 'node-fetch';

interface Card {
  id: string;
  name: string;
  description: string | null;
  act_type: string | null;
}

async function debugCardsCount() {
  console.log('🔍 INVESTIGANDO CONTAGEM DE CARDS...\n');

  // 1. Contar total de cards na tabela com limite maior
  console.log('1️⃣ Contando total de cards na tabela...');
  try {
    const totalCards = await supabaseSelect<Card[]>(
      'cards',
      'select=id&limit=10000'
    );
    console.log(`📊 Total de cards na tabela (limite 10k): ${totalCards.length}\n`);
  } catch (error) {
    console.error('❌ Erro ao contar total:', error);
  }

  // 2. Contar cards com descrição com limite maior
  console.log('2️⃣ Contando cards COM descrição...');
  try {
    const cardsWithDescription = await supabaseSelect<Card[]>(
      'cards',
      'select=id&description=not.is.null&limit=10000'
    );
    console.log(`📊 Cards COM descrição (limite 10k): ${cardsWithDescription.length}\n`);
  } catch (error) {
    console.error('❌ Erro ao contar cards com descrição:', error);
  }

  // 3. Contar cards SEM descrição com limite maior
  console.log('3️⃣ Contando cards SEM descrição...');
  try {
    const cardsWithoutDescription = await supabaseSelect<Card[]>(
      'cards',
      'select=id&description=is.null&limit=10000'
    );
    console.log(`📊 Cards SEM descrição (limite 10k): ${cardsWithoutDescription.length}\n`);
  } catch (error) {
    console.error('❌ Erro ao contar cards sem descrição:', error);
  }

  // 4. Testar com diferentes offsets para ver se há mais dados
  console.log('4️⃣ Testando diferentes offsets para encontrar mais cards...');
  try {
    const offset1000 = await supabaseSelect<Card[]>(
      'cards',
      'select=id&description=not.is.null&limit=1000&offset=1000'
    );
    const offset2000 = await supabaseSelect<Card[]>(
      'cards',
      'select=id&description=not.is.null&limit=1000&offset=2000'
    );
    const offset3000 = await supabaseSelect<Card[]>(
      'cards',
      'select=id&description=not.is.null&limit=1000&offset=3000'
    );
    
    console.log(`📄 Offset 1000: ${offset1000.length} cards`);
    console.log(`📄 Offset 2000: ${offset2000.length} cards`);
    console.log(`📄 Offset 3000: ${offset3000.length} cards\n`);
  } catch (error) {
    console.error('❌ Erro ao testar offsets:', error);
  }

  // 5. Verificar se há cards que precisam de normalização nos offsets maiores
  console.log('5️⃣ Verificando cards que precisam de normalização em offsets maiores...');
  try {
    const cardsNeedingNormalization = await supabaseSelect<Card[]>(
      'cards',
      'select=id,name,act_type&description=not.is.null&act_type=is.null&limit=1000&offset=1000'
    );
    
    console.log(`📊 Cards que precisam de normalização (offset 1000+): ${cardsNeedingNormalization.length}`);
    
    if (cardsNeedingNormalization.length > 0) {
      console.log('📋 Exemplos:');
      cardsNeedingNormalization.slice(0, 5).forEach((card, index) => {
        console.log(`${index + 1}. ID: ${card.id} | Nome: ${card.name.substring(0, 60)}... | Act Type: ${card.act_type || 'NULL'}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Erro ao buscar cards que precisam de normalização:', error);
  }

  // 6. Testar com range de IDs para ver se há gaps
  console.log('6️⃣ Testando range de IDs para identificar gaps...');
  try {
    const firstCard = await supabaseSelect<Card[]>(
      'cards',
      'select=id&order=id.asc&limit=1'
    );
    const lastCard = await supabaseSelect<Card[]>(
      'cards',
      'select=id&order=id.desc&limit=1'
    );
    
    if (firstCard.length > 0 && lastCard.length > 0) {
      console.log(`📊 Primeiro ID: ${firstCard[0].id}`);
      console.log(`📊 Último ID: ${lastCard[0].id}`);
      console.log(`📊 Diferença: ${parseInt(lastCard[0].id) - parseInt(firstCard[0].id) + 1} possíveis IDs\n`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar range de IDs:', error);
  }
}

if (require.main === module) {
  debugCardsCount().catch(console.error);
}
