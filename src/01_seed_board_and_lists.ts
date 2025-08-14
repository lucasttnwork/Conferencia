import { trelloGet, supabaseUpsert, supabaseSelect } from './lib/http';
import { env } from './lib/env';

async function main() {
  console.log('🚀 Iniciando Etapa 1: Seed do board e listas...');
  
  // 1) Board (Trello)
  console.log('📋 Buscando dados do board no Trello...');
  const board = await trelloGet<{id: string, name: string, url: string}>(`/boards/${env.TRELLO_BOARD_ID}`, { fields: 'name,url' });
  console.log(`Board encontrado: ${board.name} (${board.id})`);
  
  const boardRows = await supabaseUpsert('boards', [{
    trello_id: board.id,
    name: board.name,
    url: board.url,
  }]);
  console.log('✅ Board salvo no Supabase');

  // 2) Lists (Trello)
  console.log('📋 Buscando listas do board...');
  const lists = await trelloGet<Array<{id: string, name: string, closed: boolean, pos: number}>>(`/boards/${env.TRELLO_BOARD_ID}/lists`, { fields: 'name,closed,pos' });
  console.log(`Encontradas ${lists.length} listas`);

  // 2.1) Precisamos do UUID do board no Supabase para referenciar
  const supaBoards = await supabaseSelect<any[]>('boards', `select=id&trello_id=eq.${board.id}&limit=1`);
  const boardUuid = supaBoards?.[0]?.id;
  if (!boardUuid) throw new Error('Board UUID não encontrado após upsert');

  // 2.2) Upsert de todas as listas (em lote)
  const payload = lists.map(l => ({
    trello_id: l.id,
    name: l.name,
    pos: l.pos,
    closed: !!l.closed,
    board_id: boardUuid,
  }));

  // se o board tiver muitas listas, ainda assim é leve; upsert direto
  await supabaseUpsert('lists', payload);
  console.log(`✅ ${lists.length} listas salvas no Supabase`);
  
  console.log('🎉 Seed concluído: board + listas sincronizados!');
}

main().catch(err => {
  console.error('❌ Erro na Etapa 1:', err);
  process.exit(1);
}); 