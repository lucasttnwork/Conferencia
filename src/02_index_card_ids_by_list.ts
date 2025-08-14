import { trelloGet, supabaseUpsert, supabaseSelect } from './lib/http';
import { env } from './lib/env';
import { chunk } from './lib/map';

async function main() {
  console.log('🚀 Iniciando Etapa 2: Indexação dos IDs dos cards...');
  
  // Board UUID
  const supaBoard = await supabaseSelect<any[]>('boards', `select=id&trello_id=eq.${env.TRELLO_BOARD_ID}&limit=1`);
  const boardUuid = supaBoard?.[0]?.id;
  if (!boardUuid) throw new Error('Rode a Etapa 1 primeiro — board não encontrado');

  // Listas (Trello)
  console.log('📋 Buscando listas do board...');
  const lists = await trelloGet<Array<{id: string, name: string, closed: boolean, pos: number}>>(`/boards/${env.TRELLO_BOARD_ID}/lists`, { fields: 'name,closed,pos' });
  console.log(`Encontradas ${lists.length} listas para indexar`);

  let total = 0;
  for (const list of lists) {
    console.log(`📋 Indexando cards da lista: ${list.name} (${list.id})`);
    const cards = await trelloGet<Array<{id: string, closed: boolean, idList: string}>>(`/lists/${list.id}/cards`, { fields: 'id,closed,idList' });
    total += cards.length;

    // payload mínimo para cards (sem detalhes ainda)
    const cardRows = cards.map(c => ({
      trello_id: c.id,
      board_id: boardUuid,
      current_list_trello_id: c.idList,
      is_closed: !!c.closed,
    }));

    // upsert em lotes (se a lista tiver muitos cards)
    for (const batch of chunk(cardRows, 500)) {
      await supabaseUpsert('cards', batch);
    }
    console.log(`✅ Indexados ${cards.length} cards da lista ${list.name}`);
  }
  console.log(`🎉 Indexação concluída. Total cards indexados (mínimo): ${total}`);
}

main().catch(err => {
  console.error('❌ Erro na Etapa 2:', err);
  process.exit(1);
}); 