import { supabaseSelect, trelloGet } from './lib/http';
import { env } from './lib/env';

interface Card {
  id: string;
  trello_id: string;
  name: string;
  description: string | null;
  clerk_name: string | null;
  act_type: string | null;
  act_value: number | null;
  clerk_email: string | null;
  reconference: boolean | null;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
}

// Configurações de processamento
const BATCH_SIZE = 20; // Processar 20 cards simultaneamente
const DELAY_BETWEEN_BATCHES = 1000; // 1 segundo entre lotes para não sobrecarregar a API

/**
 * Agente que valida a existência dos cards do Trello e remove os que não existem mais
 */
class TrelloCardValidator {
  private cardsToRemove: Card[] = [];
  private totalCards = 0;
  private processedCards = 0;
  private removedCards = 0;

  /**
   * Executa a validação completa dos cards
   */
  async run(): Promise<void> {
    console.log('🚀 Iniciando validação dos cards do Trello...');
    
    try {
      // 1. Buscar todos os cards da tabela do Supabase
      const cards = await this.fetchCardsFromSupabase();
      this.totalCards = cards.length;
      console.log(`📊 Encontrados ${this.totalCards} cards na tabela do Supabase`);

      if (this.totalCards === 0) {
        console.log('✅ Nenhum card encontrado para validar');
        return;
      }

      // 2. Processar cards em lotes para verificar existência no Trello
      await this.processCardsInBatches(cards);

      // 3. Remover cards que não existem mais
      if (this.cardsToRemove.length > 0) {
        await this.removeInvalidCards();
      } else {
        console.log('✅ Todos os cards existem no Trello! Nenhuma remoção necessária.');
      }

      // 4. Exibir resumo final
      this.displaySummary();

    } catch (error) {
      console.error('❌ Erro durante a validação:', error);
      throw error;
    }
  }

  /**
   * Busca todos os cards da tabela do Supabase
   */
  private async fetchCardsFromSupabase(): Promise<Card[]> {
    try {
      const cards = await supabaseSelect<Card[]>('cards', 'select=*');
      return cards || [];
    } catch (error) {
      console.error('❌ Erro ao buscar cards do Supabase:', error);
      throw error;
    }
  }

  /**
   * Processa os cards em lotes para verificar existência no Trello
   */
  private async processCardsInBatches(cards: Card[]): Promise<void> {
    const batches = this.createBatches(cards, BATCH_SIZE);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n🔄 Processando lote ${i + 1}/${batches.length} (${batch.length} cards)`);
      
      await this.processBatch(batch);
      
      // Aguardar entre lotes para não sobrecarregar a API
      if (i < batches.length - 1) {
        await this.delay(DELAY_BETWEEN_BATCHES);
      }
    }
  }

  /**
   * Processa um lote de cards
   */
  private async processBatch(cards: Card[]): Promise<void> {
    const promises = cards.map(card => this.validateCard(card));
    await Promise.allSettled(promises);
  }

  /**
   * Valida se um card específico ainda existe no Trello
   */
  private async validateCard(card: Card): Promise<void> {
    try {
      // Buscar o card no Trello usando o trello_id
      const trelloCard = await trelloGet<TrelloCard>(`/cards/${card.trello_id}`);
      
      if (trelloCard && trelloCard.id) {
        // Card existe no Trello
        console.log(`✅ Card "${card.name}" (${card.trello_id}) existe no Trello`);
      } else {
        // Card não existe mais no Trello
        console.log(`❌ Card "${card.name}" (${card.trello_id}) NÃO existe mais no Trello`);
        this.cardsToRemove.push(card);
      }
      
    } catch (error: any) {
      // Se o erro for 404, o card não existe mais
      if (error.message.includes('404')) {
        console.log(`❌ Card "${card.name}" (${card.trello_id}) NÃO existe mais no Trello (404)`);
        this.cardsToRemove.push(card);
      } else {
        // Outro tipo de erro - logar mas não remover o card
        console.warn(`⚠️ Erro ao validar card "${card.name}" (${card.trello_id}):`, error.message);
      }
    } finally {
      this.processedCards++;
      this.updateProgress();
    }
  }

  /**
   * Remove os cards inválidos da tabela do Supabase
   */
  private async removeInvalidCards(): Promise<void> {
    console.log(`\n🗑️ Removendo ${this.cardsToRemove.length} cards inválidos...`);
    
    try {
      // Remover cards um por um para evitar problemas com lotes grandes
      for (const card of this.cardsToRemove) {
        await this.removeCardFromSupabase(card);
        this.removedCards++;
      }
      
      console.log(`✅ Remoção concluída! ${this.removedCards} cards removidos com sucesso.`);
      
    } catch (error) {
      console.error('❌ Erro ao remover cards:', error);
      throw error;
    }
  }

  /**
   * Remove um card específico da tabela do Supabase
   */
  private async removeCardFromSupabase(card: Card): Promise<void> {
    try {
      const url = new URL(`${env.SUPABASE_URL}/rest/v1/cards`);
      url.searchParams.set('trello_id', 'eq.' + card.trello_id);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      console.log(`🗑️ Card "${card.name}" (${card.trello_id}) removido com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao remover card "${card.name}" (${card.trello_id}):`, error);
      throw error;
    }
  }

  /**
   * Cria lotes de cards para processamento
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Atualiza e exibe o progresso
   */
  private updateProgress(): void {
    const percentage = Math.round((this.processedCards / this.totalCards) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    process.stdout.write(`\r${progressBar} ${percentage}% (${this.processedCards}/${this.totalCards})`);
    
    if (this.processedCards === this.totalCards) {
      process.stdout.write('\n');
    }
  }

  /**
   * Cria uma barra de progresso visual
   */
  private createProgressBar(percentage: number): string {
    const barLength = 30;
    const filledLength = Math.round((barLength * percentage) / 100);
    const emptyLength = barLength - filledLength;
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    return `[${filled}${empty}]`;
  }

  /**
   * Exibe o resumo final da operação
   */
  private displaySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de cards processados: ${this.processedCards}`);
    console.log(`Cards válidos: ${this.processedCards - this.removedCards}`);
    console.log(`Cards removidos: ${this.removedCards}`);
    console.log(`Taxa de sucesso: ${Math.round(((this.processedCards - this.removedCards) / this.processedCards) * 100)}%`);
    console.log('='.repeat(60));
  }

  /**
   * Função de delay para controlar a taxa de requisições
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Função principal para executar o validador
 */
async function main(): Promise<void> {
  try {
    const validator = new TrelloCardValidator();
    await validator.run();
    console.log('\n🎉 Validação concluída com sucesso!');
  } catch (error) {
    console.error('\n💥 Falha na validação:', error);
    process.exit(1);
  }
}

// Executar se o arquivo for chamado diretamente
if (require.main === module) {
  main();
}

export { TrelloCardValidator };
