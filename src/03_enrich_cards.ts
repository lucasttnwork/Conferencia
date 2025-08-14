import { trelloGet, supabaseSelect, supabaseUpsert } from './lib/http';
import { env } from './lib/env';
import { extractFromDescription, extractProtocolNumber } from './lib/parse';
import { chunk } from './lib/map';
// (Opcional) import pLimit from 'p-limit'; const limit = pLimit(5);

async function main() {
  console.log('🚀 Iniciando Etapa 3: Enriquecimento dos cards...');
  
  // Board UUID
  const supaBoard = await supabaseSelect<any[]>('boards', `select=id&trello_id=eq.${env.TRELLO_BOARD_ID}&limit=1`);
  const boardUuid = supaBoard?.[0]?.id;
  if (!boardUuid) throw new Error('Board não encontrado (rode Etapa 1)');

  // Buscar cards pendentes de enrich (sem name OU sem description)
  // Ajuste o filtro conforme precisar (pode enriquecer todos se preferir).
  console.log('📋 Buscando cards pendentes de enriquecimento...');
  const pending: any[] = await supabaseSelect<any[]>(
    'cards',
    `select=trello_id,current_list_trello_id&board_id=eq.${boardUuid}&or=(name.is.null,description.is.null)`
  );
  console.log(`Cards pendentes: ${pending.length}`);

  if (pending.length === 0) {
    console.log('✅ Nenhum card pendente de enriquecimento');
    return;
  }

  let processed = 0;
  for (const group of chunk(pending, 200)) {
    console.log(`📋 Processando lote de ${group.length} cards...`);
    
    // Buscar cada card no Trello
    const details: Array<{id: string, name?: string, desc?: string, shortUrl?: string, due?: string, closed: boolean, idList: string, idBoard: string}> = [];
    for (const c of group) {
      const card = await trelloGet<{id: string, name?: string, desc?: string, shortUrl?: string, due?: string, closed: boolean, idList: string, idBoard: string}>(`/cards/${c.trello_id}`, {
        fields: 'name,desc,shortUrl,due,closed,idList,idBoard',
      });
      details.push(card);
      // (se usar p-limit): await limit(() => trelloGet(...))
    }

    // Mapear e parsear
    const rows = details.map(d => {
      const parsed = extractFromDescription(d.desc || '');
      const protocol = extractProtocolNumber(d.name || null);

              return {
          trello_id: d.id,
          current_list_trello_id: d.idList,
          name: d.name || null,
          description: d.desc || null,
          url: d.shortUrl || null,
          due_at: d.due || null,
          is_closed: !!d.closed,
          // protocol_number removido temporariamente para evitar constraint
          received_at: parsed.received_at,
          received_at_text: parsed.received_at_text,
          clerk_name: parsed.clerk_name,
          act_type: parsed.act_type,
          act_value: parsed.act_value,
          act_value_text: parsed.act_value_text,
          clerk_email: parsed.clerk_email,
          reconference: parsed.reconference,
          updated_at: new Date().toISOString(),
          board_id: boardUuid, // garante o vínculo
        };
    });

    // Upsert em lotes
    for (const batch of chunk(rows, 300)) {
      await supabaseUpsert('cards', batch);
    }

    processed += group.length;
    console.log(`✅ Enriquecidos: +${group.length} (total ${processed})`);
  }

  // Opcional: backfill do current_list_id via RPC
  // await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/backfill_card_list_id`, { ... });

  console.log('🎉 Enrichment concluído.');
}

main().catch(err => {
  console.error('❌ Erro na Etapa 3:', err);
  process.exit(1);
}); 