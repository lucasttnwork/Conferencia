import { env } from './lib/env';
import fetch from 'node-fetch';

interface TrelloList {
  id: string;
  name: string;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
}

async function getBoardLists(): Promise<TrelloList[]> {
  const url = `https://api.trello.com/1/boards/${env.TRELLO_BOARD_ID}/lists?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status} ${await response.text()}`);
  }
  
  return response.json() as Promise<TrelloList[]>;
}

async function getListCards(listId: string): Promise<TrelloCard[]> {
  const url = `https://api.trello.com/1/lists/${listId}/cards?key=${env.TRELLO_KEY}&token=${env.TRELLO_TOKEN}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status} ${await response.text()}`);
  }
  
  return response.json() as Promise<TrelloCard[]>;
}

async function main() {
  try {
    console.log('🔍 Buscando listas do board...');
    const lists = await getBoardLists();
    
    console.log('\n📋 Listas encontradas:');
    lists.forEach(list => {
      console.log(`- ${list.name} (ID: ${list.id})`);
    });
    
    // Buscar a lista "Modelos de Card"
    const modelosList = lists.find(list => 
      list.name.toLowerCase().includes('modelo') || 
      list.name.toLowerCase().includes('modelos')
    );
    
    if (!modelosList) {
      console.log('\n❌ Lista "Modelos de Card" não encontrada!');
      console.log('Listas disponíveis:');
      lists.forEach(list => console.log(`- ${list.name}`));
      return;
    }
    
    console.log(`\n🎯 Lista encontrada: "${modelosList.name}"`);
    
    // Buscar os cards da lista de modelos
    console.log('\n📝 Buscando cards da lista de modelos...');
    const modelCards = await getListCards(modelosList.id);
    
    console.log(`\n✅ Encontrados ${modelCards.length} cards de modelo:`);
    modelCards.forEach((card, index) => {
      console.log(`${index + 1}. ${card.name}`);
    });
    
    // Salvar os nomes em um arquivo
    const modelNames = modelCards.map(card => card.name);
    const fs = require('fs');
    
    const outputPath = './src/card_models.json';
    fs.writeFileSync(outputPath, JSON.stringify(modelNames, null, 2));
    
    console.log(`\n💾 Modelos salvos em: ${outputPath}`);
    console.log(`\n📊 Total de modelos: ${modelNames.length}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
