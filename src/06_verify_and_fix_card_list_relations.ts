import { createClient } from '@supabase/supabase-js';
import { env } from './lib/env';
import * as fs from 'fs';
import * as path from 'path';

// Configuração do Supabase
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Card {
  id: string;
  trello_id: string;
  board_id: string;
  current_list_id: string | null;
  current_list_trello_id: string | null;
  name: string;
}

interface List {
  id: string;
  trello_id: string;
  board_id: string;
  name: string;
}

interface RelationIssue {
  card_id: string;
  card_trello_id: string;
  card_name: string;
  current_list_id: string | null;
  current_list_trello_id: string | null;
  expected_list_id: string | null;
  expected_list_name: string | null;
  issue_type: 'missing_list_id' | 'mismatched_list_id' | 'orphaned_card' | 'list_not_found';
}

class CardListRelationChecker {
  private issues: RelationIssue[] = [];
  private cards: Card[] = [];
  private lists: List[] = [];
  private boardId: string | null = null;

  async run() {
    console.log('🔍 Iniciando verificação de relacionamentos entre cards e lists...\n');
    
    try {
      // 1. Obter o board ID (assumindo que só temos um board por enquanto)
      await this.getBoardId();
      
      // 2. Carregar todas as lists do board
      await this.loadLists();
      
      // 3. Carregar todos os cards do board
      await this.loadCards();
      
      // 4. Verificar relacionamentos
      await this.checkRelationships();
      
      // 5. Gerar relatório
      this.generateReport();
      
      // 6. Aplicar correções
      await this.applyFixes();
      
      // 7. Verificação pós-correção
      await this.verifyAfterFixes();
      
    } catch (error) {
      console.error('❌ Erro durante a verificação:', error);
      process.exit(1);
    }
  }

  private async getBoardId() {
    console.log('📋 Obtendo ID do board...');
    
    const { data: boards, error } = await supabase
      .from('boards')
      .select('id, name')
      .limit(1);
    
    if (error) {
      throw new Error(`Erro ao obter boards: ${error.message}`);
    }
    
    if (!boards || boards.length === 0) {
      throw new Error('Nenhum board encontrado no banco de dados');
    }
    
    this.boardId = boards[0].id;
    console.log(`✅ Board encontrado: ${boards[0].name} (ID: ${this.boardId})\n`);
  }

  private async loadLists() {
    console.log('📋 Carregando lists do board...');
    
    const { data: lists, error } = await supabase
      .from('lists')
      .select('id, trello_id, board_id, name')
      .eq('board_id', this.boardId)
      .eq('closed', false); // Apenas lists ativas
    
    if (error) {
      throw new Error(`Erro ao carregar lists: ${error.message}`);
    }
    
    this.lists = lists || [];
    console.log(`✅ ${this.lists.length} lists carregadas\n`);
    
    // Log das lists para debug
    this.lists.forEach(list => {
      console.log(`  📋 ${list.name} (Trello ID: ${list.trello_id}, DB ID: ${list.id})`);
    });
    console.log('');
  }

  private async loadCards() {
    console.log('🃏 Carregando cards do board...');
    
    const { data: cards, error } = await supabase
      .from('cards')
      .select('id, trello_id, board_id, current_list_id, current_list_trello_id, name')
      .eq('board_id', this.boardId);
    
    if (error) {
      throw new Error(`Erro ao carregar cards: ${error.message}`);
    }
    
    this.cards = cards || [];
    console.log(`✅ ${this.cards.length} cards carregados\n`);
  }

  private async checkRelationships() {
    console.log('🔍 Verificando relacionamentos...');
    
    for (const card of this.cards) {
      const issue = this.analyzeCardRelationships(card);
      if (issue) {
        this.issues.push(issue);
      }
    }
    
    console.log(`✅ Verificação concluída. ${this.issues.length} problemas encontrados\n`);
  }

  private analyzeCardRelationships(card: Card): RelationIssue | null {
    // Encontrar a list correspondente pelo trello_id
    const expectedList = this.lists.find(list => list.trello_id === card.current_list_trello_id);
    
    if (!expectedList) {
      // Card está em uma list que não existe mais
      return {
        card_id: card.id,
        card_trello_id: card.trello_id,
        card_name: card.name,
        current_list_id: card.current_list_id,
        current_list_trello_id: card.current_list_trello_id,
        expected_list_id: null,
        expected_list_name: null,
        issue_type: 'list_not_found'
      };
    }
    
    if (!card.current_list_id) {
      // Card não tem list_id mas tem list_trello_id
      return {
        card_id: card.id,
        card_trello_id: card.trello_id,
        card_name: card.name,
        current_list_id: card.current_list_id,
        current_list_trello_id: card.current_list_trello_id,
        expected_list_id: expectedList.id,
        expected_list_name: expectedList.name,
        issue_type: 'missing_list_id'
      };
    }
    
    if (card.current_list_id !== expectedList.id) {
      // Card tem list_id incorreto
      return {
        card_id: card.id,
        card_trello_id: card.trello_id,
        card_name: card.name,
        current_list_id: card.current_list_id,
        current_list_trello_id: card.current_list_trello_id,
        expected_list_id: expectedList.id,
        expected_list_name: expectedList.name,
        issue_type: 'mismatched_list_id'
      };
    }
    
    // Card está correto
    return null;
  }

  private generateReport() {
    console.log('📊 RELATÓRIO DE PROBLEMAS ENCONTRADOS\n');
    console.log('=' .repeat(80));
    
    if (this.issues.length === 0) {
      console.log('✅ Nenhum problema encontrado! Todos os relacionamentos estão corretos.\n');
      return;
    }
    
    // Agrupar por tipo de problema
    const issuesByType = this.issues.reduce((acc, issue) => {
      if (!acc[issue.issue_type]) {
        acc[issue.issue_type] = [];
      }
      acc[issue.issue_type].push(issue);
      return acc;
    }, {} as Record<string, RelationIssue[]>);
    
    // Mostrar estatísticas
    console.log('📈 ESTATÍSTICAS:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      const typeLabel = this.getIssueTypeLabel(type);
      console.log(`  ${typeLabel}: ${issues.length} cards`);
    });
    console.log('');
    
    // Mostrar detalhes por tipo
    Object.entries(issuesByType).forEach(([type, issues]) => {
      const typeLabel = this.getIssueTypeLabel(type);
      console.log(`🔍 ${typeLabel.toUpperCase()} (${issues.length} cards):`);
      console.log('-'.repeat(60));
      
      issues.slice(0, 10).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.card_name}`);
        console.log(`   Card ID: ${issue.card_id}`);
        console.log(`   Trello ID: ${issue.card_trello_id}`);
        console.log(`   List ID atual: ${issue.current_list_id || 'NULL'}`);
        console.log(`   List Trello ID: ${issue.current_list_trello_id || 'NULL'}`);
        
        if (issue.expected_list_id) {
          console.log(`   List ID esperado: ${issue.expected_list_id}`);
          console.log(`   List nome esperado: ${issue.expected_list_name}`);
        }
        console.log('');
      });
      
      if (issues.length > 10) {
        console.log(`   ... e mais ${issues.length - 10} cards com o mesmo problema\n`);
      }
    });
    
    console.log('=' .repeat(80));
    console.log('');
  }

  private getIssueTypeLabel(type: string): string {
    const labels = {
      'missing_list_id': 'List ID ausente',
      'mismatched_list_id': 'List ID incorreto',
      'orphaned_card': 'Card órfão',
      'list_not_found': 'List não encontrada'
    };
    return labels[type as keyof typeof labels] || type;
  }

  private async applyFixes() {
    if (this.issues.length === 0) {
      console.log('✅ Nenhuma correção necessária.\n');
      return;
    }
    
    console.log('🔧 Aplicando correções...\n');
    
    // 1. Usar a função RPC existente para backfill
    console.log('📋 Executando backfill automático...');
    const { error: backfillError } = await supabase.rpc('backfill_card_list_id', {
      p_board_id: this.boardId
    });
    
    if (backfillError) {
      console.log(`⚠️ Erro no backfill automático: ${backfillError.message}`);
      console.log('🔄 Tentando correção manual...\n');
    } else {
      console.log('✅ Backfill automático executado com sucesso\n');
    }
    
    // 2. Correções manuais para problemas específicos
    await this.applyManualFixes();
    
    console.log('✅ Todas as correções foram aplicadas\n');
  }

  private async applyManualFixes() {
    console.log('🔧 Aplicando correções manuais...');
    
    let fixedCount = 0;
    
    for (const issue of this.issues) {
      if (issue.issue_type === 'missing_list_id' && issue.expected_list_id) {
        // Corrigir list_id ausente
        const { error } = await supabase
          .from('cards')
          .update({ current_list_id: issue.expected_list_id })
          .eq('id', issue.card_id);
        
        if (!error) {
          fixedCount++;
          console.log(`  ✅ Corrigido: ${issue.card_name} → List ID: ${issue.expected_list_id}`);
        } else {
          console.log(`  ❌ Erro ao corrigir ${issue.card_name}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ ${fixedCount} cards corrigidos manualmente\n`);
  }

  private async verifyAfterFixes() {
    console.log('🔍 Verificando relacionamentos após as correções...\n');
    
    // Recarregar cards para verificar o estado atual
    const { data: cardsAfterFix, error } = await supabase
      .from('cards')
      .select('id, trello_id, board_id, current_list_id, current_list_trello_id, name')
      .eq('board_id', this.boardId);
    
    if (error) {
      console.log(`⚠️ Erro ao verificar após correções: ${error.message}`);
      return;
    }
    
    // Verificar novamente
    const remainingIssues: RelationIssue[] = [];
    
    for (const card of cardsAfterFix || []) {
      const issue = this.analyzeCardRelationships(card);
      if (issue) {
        remainingIssues.push(issue);
      }
    }
    
    if (remainingIssues.length === 0) {
      console.log('🎉 PERFEITO! Todos os relacionamentos foram corrigidos com sucesso!\n');
    } else {
      console.log(`⚠️ Ainda existem ${remainingIssues.length} problemas após as correções:\n`);
      remainingIssues.slice(0, 5).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.card_name} - ${this.getIssueTypeLabel(issue.issue_type)}`);
      });
      
      if (remainingIssues.length > 5) {
        console.log(`   ... e mais ${remainingIssues.length - 5} problemas`);
      }
      console.log('');
    }
  }
}

// Executar o verificador
async function main() {
  const checker = new CardListRelationChecker();
  await checker.run();
  
  console.log('🏁 Verificação e correção concluídas!');
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { CardListRelationChecker };
