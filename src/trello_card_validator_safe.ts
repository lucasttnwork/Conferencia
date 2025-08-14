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
const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 1000;
const CARDS_PER_PAGE = 1000; // Máximo de cards por página do Supabase

/**
 * Versão segura do validador que permite dry run e paginação completa
 */
class TrelloCardValidatorSafe {
  private cardsToRemove: Card[] = [];
  private totalCards = 0;
  private processedCards = 0;
  private isDryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.isDryRun = dryRun;
  }

  /**
   * Executa a validação com opção de dry run e paginação completa
   */
  async run(): Promise<void> {
    const mode = this.isDryRun ? 'DRY RUN' : 'EXECUÇÃO REAL';
    console.log(`🚀 Iniciando validação dos cards do Trello (${mode})...`);
    
    if (this.isDryRun) {
      console.log('⚠️  MODO DRY RUN: Nenhum card será removido');
    } else {
      console.log('🗑️  MODO EXECUÇÃO REAL: Cards inválidos serão removidos!');
    }
    
    try {
      // 1. Buscar todos os cards da tabela do Supabase com paginação
      const allCards = await this.fetchAllCardsFromSupabase();
      this.totalCards = allCards.length;
      console.log(`📊 Encontrados ${this.totalCards} cards no total na tabela do Supabase`);

      if (this.totalCards === 0) {
        console.log('✅ Nenhum card encontrado para validar');
        return;
      }

      // 2. Processar cards em lotes para verificar existência no Trello
      await this.processCardsInBatches(allCards);

      // 3. Exibir resultados
      if (this.cardsToRemove.length > 0) {
        this.displayRemovalPreview();
        
        if (!this.isDryRun) {
          await this.removeInvalidCards();
        }
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
   * Busca TODOS os cards da tabela do Supabase usando paginação
   */
  private async fetchAllCardsFromSupabase(): Promise<Card[]> {
    const allCards: Card[] = [];
    let page = 0;
    let hasMore = true;

    console.log('🔄 Buscando todos os cards com paginação...');

    while (hasMore) {
      try {
        const offset = page * CARDS_PER_PAGE;
        const query = `select=*&limit=${CARDS_PER_PAGE}&offset=${offset}`;
        
        console.log(`📄 Buscando página ${page + 1} (offset: ${offset}, limit: ${CARDS_PER_PAGE})`);
        
        const cards = await supabaseSelect<Card[]>('cards', query);
        
        if (cards && cards.length > 0) {
          allCards.push(...cards);
          console.log(`✅ Página ${page + 1}: ${cards.length} cards encontrados`);
          
          // Se retornou menos cards que o limite, chegamos ao fim
          if (cards.length < CARDS_PER_PAGE) {
            hasMore = false;
            console.log('🏁 Última página alcançada');
          }
        } else {
          hasMore = false;
          console.log('🏁 Nenhum card encontrado nesta página');
        }
        
        page++;
        
        // Pequena pausa entre páginas para não sobrecarregar
        if (hasMore) {
          await this.delay(500);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao buscar página ${page + 1}:`, error);
        throw error;
      }
    }

    console.log(`📊 Total de cards coletados: ${allCards.length}`);
    return allCards;
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
      const trelloCard = await trelloGet<TrelloCard>(`/cards/${card.trello_id}`);
      
      if (trelloCard && trelloCard.id) {
        console.log(`✅ Card "${card.name}" (${card.trello_id}) existe no Trello`);
      } else {
        console.log(`❌ Card "${card.name}" (${card.trello_id}) NÃO existe mais no Trello`);
        this.cardsToRemove.push(card);
      }
      
    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log(`❌ Card "${card.name}" (${card.trello_id}) NÃO existe mais no Trello (404)`);
        this.cardsToRemove.push(card);
      } else {
        console.warn(`⚠️ Erro ao validar card "${card.name}" (${card.trello_id}):`, error.message);
      }
    } finally {
      this.processedCards++;
      this.updateProgress();
    }
  }

  /**
   * Exibe preview dos cards que seriam removidos
   */
  private displayRemovalPreview(): void {
    console.log(`\n📋 PREVIEW DOS CARDS QUE SERIAM REMOVIDOS:`);
    console.log('='.repeat(60));
    
    this.cardsToRemove.forEach((card, index) => {
      console.log(`${index + 1}. "${card.name}" (${card.trello_id})`);
      console.log(`   Descrição: ${card.description || 'N/A'}`);
      console.log(`   Escrivão: ${card.clerk_name || 'N/A'}`);
      console.log(`   Tipo: ${card.act_type || 'N/A'}`);
      console.log('');
    });
    
    console.log(`Total: ${this.cardsToRemove.length} cards`);
    console.log('='.repeat(60));
  }

  /**
   * Remove os cards inválidos da tabela do Supabase
   */
  private async removeInvalidCards(): Promise<void> {
    console.log(`\n🗑️ Removendo ${this.cardsToRemove.length} cards inválidos...`);
    
    try {
      for (const card of this.cardsToRemove) {
        await this.removeCardFromSupabase(card);
      }
      
      console.log(`✅ Remoção concluída! ${this.cardsToRemove.length} cards removidos com sucesso.`);
      
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
    const mode = this.isDryRun ? 'DRY RUN' : 'EXECUÇÃO REAL';
    const removedText = this.isDryRun ? 'seriam removidos' : 'foram removidos';
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESUMO DA VALIDAÇÃO (${mode})`);
    console.log('='.repeat(60));
    console.log(`Total de cards processados: ${this.processedCards}`);
    console.log(`Cards válidos: ${this.processedCards - this.cardsToRemove.length}`);
    console.log(`Cards que ${removedText}: ${this.cardsToRemove.length}`);
    console.log(`Taxa de sucesso: ${Math.round(((this.processedCards - this.cardsToRemove.length) / this.processedCards) * 100)}%`);
    
    if (this.isDryRun && this.cardsToRemove.length > 0) {
      console.log('\n💡 Para executar a remoção real, use:');
      console.log('   npx tsx src/trello_card_validator_safe.ts --execute');
    }
    
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
 * Função principal que verifica argumentos de linha de comando
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  
  try {
    const validator = new TrelloCardValidatorSafe(isDryRun);
    await validator.run();
    
    if (isDryRun) {
      console.log('\n🎯 Dry run concluído! Revise os resultados antes de executar.');
    } else {
      console.log('\n🎉 Validação e limpeza concluídas com sucesso!');
    }
  } catch (error) {
    console.error('\n💥 Falha na validação:', error);
    process.exit(1);
  }
}

// Executar se o arquivo for chamado diretamente
if (require.main === module) {
  main();
}

export { TrelloCardValidatorSafe };
