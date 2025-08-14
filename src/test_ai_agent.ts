import { callOpenAI } from './05_card_info_extractor';

async function testOpenAI() {
  console.log('🧪 Testando conexão com OpenAI...');
  
  try {
    const testMessage = `Extraia as informações deste card:

Nome: "Protocolo 321400 - Escritura de Compra e Venda"

Descrição: "Escrevente: João Silva
Natureza: Escritura de Compra e Venda
Valor: R$ 150.000,00
E-mail: joao.silva@email.com
Reconferência: sim"`;

    const response = await callOpenAI([
      { role: 'system', content: 'Você é um assistente de teste. Responda apenas "OK" se recebeu a mensagem.' },
      { role: 'user', content: testMessage }
    ]);

    console.log('✅ OpenAI funcionando!');
    console.log('Resposta:', response);
    
  } catch (error) {
    console.error('❌ Erro ao testar OpenAI:', error);
  }
}

if (require.main === module) {
  testOpenAI().catch(console.error);
}
