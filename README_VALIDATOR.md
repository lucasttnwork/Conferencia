# 🧹 Validador de Cards do Trello

Este agente verifica a existência dos cards do Trello armazenados na tabela do Supabase e remove automaticamente os que não existem mais.

## 🎯 Funcionalidades

- ✅ **Validação Automática**: Verifica se cada card ainda existe no Trello
- 🗑️ **Limpeza Automática**: Remove cards que não existem mais
- 📊 **Processamento em Lotes**: Processa cards em lotes para otimizar performance
- 🚀 **Progresso Visual**: Barra de progresso em tempo real
- 📈 **Relatório Detalhado**: Resumo completo da operação
- 🛡️ **Modo Seguro**: Dry run antes da execução real

## 🚀 Como Usar

### 1. Configuração das Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp env.validator.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Configurações do Trello
TRELLO_KEY=sua_chave_do_trello
TRELLO_TOKEN=seu_token_do_trello
TRELLO_BOARD_ID=id_do_board_do_trello

# Configurações do Supabase
SUPABASE_URL=https://seu_projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase

# Configurações da OpenAI (não necessárias para este validador, mas mantidas para compatibilidade)
OPENAI_API_KEY=sua_chave_da_openai
```

### 2. Execução

#### Versão Segura (Recomendada)
```bash
# Dry run - apenas verifica, não remove nada
npx ts-node src/trello_card_validator_safe.ts

# Execução real - remove cards inválidos
npx ts-node src/trello_card_validator_safe.ts --execute
```

#### Versão Original
```bash
# Executar o validador (remove cards imediatamente)
npx ts-node src/trello_card_validator.ts

# Ou se estiver usando tsx
npx tsx src/trello_card_validator.ts
```

### 3. Uso Programático

```typescript
import { TrelloCardValidatorSafe } from './src/trello_card_validator_safe';

async function validateCards() {
  // Dry run primeiro
  const validator = new TrelloCardValidatorSafe(true);
  await validator.run();
  
  // Se estiver satisfeito com os resultados, executar
  const executor = new TrelloCardValidatorSafe(false);
  await executor.run();
}

validateCards();
```

## 🔧 Configurações

### Tamanho dos Lotes
- **BATCH_SIZE**: 20 cards por lote (configurável)
- **DELAY_BETWEEN_BATCHES**: 1 segundo entre lotes

### Performance
- Processamento paralelo dentro de cada lote
- Controle de taxa para não sobrecarregar a API do Trello
- Timeout automático entre requisições

## 📊 Saída do Programa

### Durante a Execução
```
🚀 Iniciando validação dos cards do Trello (DRY RUN)...
⚠️  MODO DRY RUN: Nenhum card será removido
📊 Encontrados 150 cards na tabela do Supabase

🔄 Processando lote 1/8 (20 cards)
✅ Card "📌 Escritura de Venda" (abc123) existe no Trello
❌ Card "📌 Procuração" (def456) NÃO existe mais no Trello
[████████████████████████████░░] 100% (150/150)

📋 PREVIEW DOS CARDS QUE SERIAM REMOVIDOS:
============================================================
1. "📌 Procuração" (def456)
   Descrição: Procuração para venda de imóvel
   Escrivão: João Silva
   Tipo: Procuração

Total: 5 cards
============================================================
```

### Resumo Final
```
============================================================
📊 RESUMO DA VALIDAÇÃO (DRY RUN)
============================================================
Total de cards processados: 150
Cards válidos: 145
Cards que seriam removidos: 5
Taxa de sucesso: 97%

💡 Para executar a remoção real, use:
   npx ts-node src/trello_card_validator_safe.ts --execute
============================================================
🎯 Dry run concluído! Revise os resultados antes de executar.
```

## 🛡️ Segurança

- **Autenticação**: Usa Service Role Key do Supabase para operações de DELETE
- **Validação**: Só remove cards após confirmação de que não existem no Trello
- **Logs**: Registra todas as operações para auditoria
- **Tratamento de Erros**: Continua processando mesmo se alguns cards falharem
- **Dry Run**: Permite revisar o que seria removido antes da execução real

## ⚠️ Considerações Importantes

1. **Backup**: Sempre faça backup da tabela antes de executar
2. **Dry Run**: Sempre execute primeiro em modo dry run
3. **Horário**: Execute em horários de baixo tráfego
4. **Monitoramento**: Acompanhe os logs durante a execução
5. **Teste**: Teste primeiro com uma tabela pequena

## 🔍 Como Funciona

1. **Busca**: Obtém todos os cards da tabela `cards` do Supabase
2. **Validação**: Para cada card, verifica se ainda existe no Trello via API
3. **Identificação**: Marca cards que retornam erro 404 (não existem)
4. **Preview**: Exibe detalhes dos cards que seriam removidos
5. **Remoção**: Remove cards inválidos da tabela do Supabase (apenas se não for dry run)
6. **Relatório**: Exibe estatísticas completas da operação

## 🚨 Tratamento de Erros

- **404**: Card não existe no Trello → Remove do Supabase
- **Rate Limit**: Aguarda automaticamente entre requisições
- **Timeout**: Continua com o próximo card em caso de falha
- **Logs**: Registra todos os erros para análise posterior

## 📝 Logs e Auditoria

Todos os cards removidos são logados com:
- Nome do card
- ID do Trello
- Descrição
- Escrivão
- Tipo de ato
- Timestamp da remoção
- Status da operação

## 🔄 Agendamento

Para execução automática, configure um cron job:

```bash
# Executar diariamente às 2h da manhã (dry run)
0 2 * * * cd /caminho/do/projeto && npx ts-node src/trello_card_validator_safe.ts

# Executar semanalmente às 3h da manhã (execução real)
0 3 * * 0 cd /caminho/do/projeto && npx ts-node src/trello_card_validator_safe.ts --execute
```

## 📞 Suporte

Em caso de problemas:
1. Verifique as credenciais no arquivo `.env`
2. Confirme a conectividade com Trello e Supabase
3. Analise os logs de erro
4. Teste com uma tabela pequena primeiro
5. Use sempre o modo dry run primeiro

## 🔄 Fluxo Recomendado

1. **Primeira Execução**: `npx ts-node src/trello_card_validator_safe.ts`
2. **Revisar Resultados**: Analise os cards que seriam removidos
3. **Backup**: Faça backup da tabela se necessário
4. **Execução Real**: `npx ts-node src/trello_card_validator_safe.ts --execute`
5. **Verificação**: Confirme que a operação foi bem-sucedida
