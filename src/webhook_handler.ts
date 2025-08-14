import express from 'express';
import { supabaseUpsert, supabaseSelect } from './lib/http';
import { env } from './lib/env';
import { extractFromDescription, extractProtocolNumber } from './lib/parse';

const app = express();
app.use(express.json());

// Middleware para validar webhook do Trello
const validateWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const modelId = req.body?.model?.id;
  if (modelId === env.TRELLO_BOARD_ID) {
    next();
  } else {
    res.status(400).send('Invalid board ID');
  }
};

// Registrar webhook event para auditoria
async function logWebhookEvent(action: any) {
  try {
    await supabaseUpsert('webhook_events', [{
      board_id: null, // Será resolvido depois
      trello_action_id: action.id,
      action_type: action.type,
      payload: action,
      received_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('Erro ao registrar webhook event:', error);
  }
}

// Processar mudanças de card
async function processCardChange(action: any) {
  const cardId = action.data?.card?.id;
  if (!cardId) return;

  try {
    // Buscar board UUID
    const boards = await supabaseSelect<any[]>('boards', `select=id&trello_id=eq.${env.TRELLO_BOARD_ID}&limit=1`);
    const boardUuid = boards?.[0]?.id;
    if (!boardUuid) return;

    // Buscar detalhes do card no Trello
    const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}&fields=name,desc,shortUrl,due,closed,idList,idBoard`);
    const card = await response.json();

    if (!card.id) return;

    // Parsear dados
    const parsed = extractFromDescription(card.desc || '');
    const protocol = extractProtocolNumber(card.name || null);

    // Upsert card
    await supabaseUpsert('cards', [{
      trello_id: card.id,
      board_id: boardUuid,
      current_list_trello_id: card.idList,
      name: card.name || null,
      description: card.desc || null,
      url: card.shortUrl || null,
      due_at: card.due || null,
      is_closed: !!card.closed,
      protocol_number: protocol,
      received_at: parsed.received_at,
      received_at_text: parsed.received_at_text,
      clerk_name: parsed.clerk_name,
      act_type: parsed.act_type,
      act_value: parsed.act_value,
      act_value_text: parsed.act_value_text,
      clerk_email: parsed.clerk_email,
      reconference: parsed.reconference,
      updated_at: new Date().toISOString(),
    }]);

    console.log(`✅ Card ${cardId} atualizado via webhook`);
  } catch (error) {
    console.error(`❌ Erro ao processar card ${cardId}:`, error);
  }
}

// Processar movimentação de card
async function processCardMovement(action: any) {
  const cardId = action.data?.card?.id;
  const listBefore = action.data?.listBefore?.id;
  const listAfter = action.data?.listAfter?.id;
  
  if (!cardId || !listBefore || !listAfter) return;

  try {
    // Buscar board UUID
    const boards = await supabaseSelect<any[]>('boards', `select=id&trello_id=eq.${env.TRELLO_BOARD_ID}&limit=1`);
    const boardUuid = boards?.[0]?.id;
    if (!boardUuid) return;

    // Buscar list UUIDs
    const lists = await supabaseSelect<any[]>('lists', `select=id,trello_id&or=(trello_id.eq.${listBefore},trello_id.eq.${listAfter})`);
    const fromList = lists.find(l => l.trello_id === listBefore);
    const toList = lists.find(l => l.trello_id === listAfter);

    // Buscar card UUID
    const cards = await supabaseSelect<any[]>('cards', `select=id&trello_id=eq.${cardId}&limit=1`);
    const cardUuid = cards?.[0]?.id;
    if (!cardUuid) return;

    // Registrar movimentação
    await supabaseUpsert('card_movements', [{
      card_id: cardUuid,
      board_id: boardUuid,
      from_list_id: fromList?.id || null,
      to_list_id: toList?.id || null,
      moved_by_member_id: null, // Será implementado depois
      moved_at: new Date(action.date).toISOString(),
      trello_action_id: action.id,
    }]);

    // Atualizar current_list_id do card
    await supabaseUpsert('cards', [{
      trello_id: cardId,
      current_list_id: toList?.id || null,
      current_list_trello_id: listAfter,
      updated_at: new Date().toISOString(),
    }]);

    console.log(`✅ Movimentação do card ${cardId} registrada: ${listBefore} → ${listAfter}`);
  } catch (error) {
    console.error(`❌ Erro ao processar movimentação do card ${cardId}:`, error);
  }
}

// Endpoint para receber webhooks do Trello
app.post('/webhook/trello', validateWebhook, async (req, res) => {
  const action = req.body;
  
  try {
    // Registrar evento
    await logWebhookEvent(action);

    // Processar baseado no tipo de ação
    switch (action.type) {
      case 'updateCard':
        await processCardChange(action);
        if (action.data?.listBefore && action.data?.listAfter) {
          await processCardMovement(action);
        }
        break;
      
      case 'createCard':
        await processCardChange(action);
        break;
      
      case 'addMemberToCard':
      case 'removeMemberFromCard':
        // Será implementado depois
        break;
      
      case 'addLabelToCard':
      case 'removeLabelFromCard':
        // Será implementado depois
        break;
      
      default:
        console.log(`ℹ️ Ação não processada: ${action.type}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/webhook/trello`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app; 