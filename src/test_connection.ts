import { trelloGet, supabaseSelect } from './lib/http';
import { env } from './lib/env';

async function testConnections() {
  console.log('🔍 Testando conexões...\n');

  // Teste 1: Trello API
  try {
    console.log('📋 Testando API do Trello...');
    const board = await trelloGet<{id: string, name: string}>(`/boards/${env.TRELLO_BOARD_ID}`, { fields: 'name' });
    console.log(`✅ Trello OK - Board: ${board.name} (${board.id})`);
  } catch (error) {
    console.error('❌ Erro no Trello:', error);
    return;
  }

  // Teste 2: Supabase
  try {
    console.log('\n📋 Testando Supabase...');
    const result = await supabaseSelect<any[]>('boards', 'select=count&limit=1');
    console.log('✅ Supabase OK - Conexão estabelecida');
  } catch (error) {
    console.error('❌ Erro no Supabase:', error);
    return;
  }

  console.log('\n🎉 Todas as conexões estão funcionando!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Execute: npm run seed');
  console.log('2. Execute: npm run index');
  console.log('3. Execute: npm run enrich');
}

testConnections().catch(console.error); 