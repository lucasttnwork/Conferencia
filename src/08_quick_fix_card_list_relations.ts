import { createClient } from '@supabase/supabase-js';
import { env } from './lib/env';

// Configuração do Supabase
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickFixCardListRelations() {
  console.log('🔧 Iniciando correção rápida dos relacionamentos entre cards e lists...\n');
  
  try {
    // 1. Obter board ID
    const { data: boards, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .limit(1);
    
    if (boardError || !boards || boards.length === 0) {
      throw new Error('Nenhum board encontrado');
    }
    
    const boardId = boards[0].id;
    console.log(`✅ Board: ${boards[0].name} (ID: ${boardId})\n`);
    
    // 2. Verificar situação atual
    console.log('📊 Verificando situação atual...');
    
    const { data: currentStatus, error: statusError } = await supabase
      .from('cards')
      .select('current_list_id, current_list_trello_id')
      .eq('board_id', boardId);
    
    if (statusError) {
      throw new Error(`Erro ao verificar status: ${statusError.message}`);
    }
    
    const totalCards = currentStatus?.length || 0;
    const cardsWithoutListId = currentStatus?.filter(c => !c.current_list_id).length || 0;
    const cardsWithListId = totalCards - cardsWithoutListId;
    
    console.log(`📈 Status atual:`);
    console.log(`   Total de cards: ${totalCards}`);
    console.log(`   Cards com list_id: ${cardsWithListId}`);
    console.log(`   Cards sem list_id: ${cardsWithoutListId}\n`);
    
    if (cardsWithoutListId === 0) {
      console.log('✅ Todos os cards já têm list_id! Nenhuma correção necessária.\n');
      return;
    }
    
    // 3. Aplicar correção automática usando a função RPC existente
    console.log('🔧 Aplicando correção automática...');
    
    const { error: backfillError } = await supabase.rpc('backfill_card_list_id', {
      p_board_id: boardId
    });
    
    if (backfillError) {
      console.log(`⚠️ Erro no backfill automático: ${backfillError.message}`);
      console.log('🔄 Tentando correção manual...\n');
      
      // Correção manual
      await manualFix();
    } else {
      console.log('✅ Correção automática executada com sucesso!\n');
    }
    
    // 4. Verificar resultado
    console.log('🔍 Verificando resultado...');
    
    const { data: afterFix, error: afterError } = await supabase
      .from('cards')
      .select('current_list_id, current_list_trello_id')
      .eq('board_id', boardId);
    
    if (afterError) {
      throw new Error(`Erro ao verificar após correção: ${afterError.message}`);
    }
    
    const cardsFixed = afterFix?.filter(c => c.current_list_id).length || 0;
    const cardsStillWithoutId = totalCards - cardsFixed;
    
    console.log(`📊 Resultado após correção:`);
    console.log(`   Total de cards: ${totalCards}`);
    console.log(`   Cards com list_id: ${cardsFixed}`);
    console.log(`   Cards sem list_id: ${cardsStillWithoutId}`);
    
    if (cardsStillWithoutId === 0) {
      console.log('\n🎉 PERFEITO! Todos os relacionamentos foram corrigidos!\n');
    } else {
      console.log(`\n⚠️ Ainda existem ${cardsStillWithoutId} cards sem list_id.`);
      console.log('   Pode ser necessário verificar se todas as lists estão sincronizadas.\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    process.exit(1);
  }
}

async function manualFix() {
  console.log('🔧 Aplicando correção manual...');
  
  try {
    // Buscar cards que precisam de correção
    const { data: cardsToFix, error: selectError } = await supabase
      .from('cards')
      .select('id, current_list_trello_id')
      .is('current_list_id', null)
      .not('current_list_trello_id', 'is', null);
    
    if (selectError) {
      console.log(`⚠️ Erro ao buscar cards para correção: ${selectError.message}`);
      return;
    }
    
    if (!cardsToFix || cardsToFix.length === 0) {
      console.log('✅ Nenhum card precisa de correção manual');
      return;
    }
    
    console.log(`🔧 Corrigindo ${cardsToFix.length} cards...`);
    
    let fixedCount = 0;
    
    // Corrigir cada card individualmente
    for (const card of cardsToFix) {
      if (!card.current_list_trello_id) continue;
      
      // Buscar a list correspondente
      const { data: list, error: listError } = await supabase
        .from('lists')
        .select('id')
        .eq('trello_id', card.current_list_trello_id)
        .eq('closed', false)
        .single();
      
      if (listError || !list) {
        console.log(`⚠️ List não encontrada para card ${card.id} (trello_id: ${card.current_list_trello_id})`);
        continue;
      }
      
      // Atualizar o card
      const { error: updateError } = await supabase
        .from('cards')
        .update({ current_list_id: list.id })
        .eq('id', card.id);
      
      if (updateError) {
        console.log(`⚠️ Erro ao corrigir card ${card.id}: ${updateError.message}`);
      } else {
        fixedCount++;
      }
    }
    
    console.log(`✅ ${fixedCount} cards corrigidos manualmente`);
    
  } catch (error) {
    console.log(`⚠️ Erro na correção manual: ${error}`);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  quickFixCardListRelations().catch(console.error);
}

export { quickFixCardListRelations };
