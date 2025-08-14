import { TrelloCardValidator } from './trello_card_validator';

/**
 * Script de teste para o validador de cards
 * Executa uma validação de teste sem remover cards
 */
async function testValidator(): Promise<void> {
  console.log('🧪 Iniciando teste do validador...');
  
  try {
    // Criar instância do validador
    const validator = new TrelloCardValidator();
    
    // Executar validação
    await validator.run();
    
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executar teste
if (require.main === module) {
  testValidator();
}
