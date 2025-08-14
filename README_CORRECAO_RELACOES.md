# 🔧 Correção de Relacionamentos entre Cards e Lists

Este documento explica como verificar e corrigir os relacionamentos entre as tabelas `cards` e `lists` no Supabase.

## 📋 Problema Identificado

Na estrutura atual do banco de dados:
- A tabela `cards` tem um campo `current_list_id` que deve referenciar o `id` da tabela `lists`
- Também tem um campo `current_list_trello_id` que deve corresponder ao `trello_id` da tabela `lists`
- Alguns cards podem ter problemas de relacionamento que impedem o funcionamento correto do dashboard

## 🛠️ Soluções Disponíveis

### 1. Script TypeScript Completo (`06_verify_and_fix_card_list_relations.ts`)

**Uso:** Para uma verificação completa e correção automática
```bash
cd src
npx ts-node 06_verify_and_fix_card_list_relations.ts
```

**Funcionalidades:**
- ✅ Verifica todos os relacionamentos
- 📊 Gera relatório detalhado dos problemas
- 🔧 Aplica correções automáticas
- 🔍 Verifica o resultado após as correções

### 2. Script SQL (`07_sql_card_list_verification.sql`)

**Uso:** Execute no Supabase SQL Editor para análise detalhada

**Funcionalidades:**
- 🔍 Queries de verificação detalhada
- 📈 Estatísticas completas
- 🛠️ Funções de correção automática
- 📊 Verificação pós-correção

### 3. Script Rápido (`08_quick_fix_card_list_relations.ts`)

**Uso:** Para correção rápida sem análise detalhada
```bash
cd src
npx ts-node 08_quick_fix_card_list_relations.ts
```

**Funcionalidades:**
- ⚡ Correção rápida e direta
- 🔧 Usa a função RPC existente
- 📊 Relatório simples do resultado

## 🚀 Como Executar

### Pré-requisitos
1. Certifique-se de que as variáveis de ambiente estão configuradas:
   ```bash
   cp env.example .env
   # Edite o .env com suas credenciais do Supabase
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

### Execução Recomendada

1. **Primeiro, execute a verificação completa:**
   ```bash
   npx ts-node src/06_verify_and_fix_card_list_relations.ts
   ```

2. **Se quiser apenas corrigir rapidamente:**
   ```bash
   npx ts-node src/08_quick_fix_card_list_relations.ts
   ```

3. **Para análise detalhada no Supabase:**
   - Copie o conteúdo de `07_sql_card_list_verification.sql`
   - Execute no SQL Editor do Supabase

## 🔍 Tipos de Problemas Identificados

### 1. **List ID Ausente** (`missing_list_id`)
- Card tem `current_list_trello_id` mas não tem `current_list_id`
- **Solução:** Preencher automaticamente o `current_list_id`

### 2. **List ID Incorreto** (`mismatched_list_id`)
- Card tem `current_list_id` que não corresponde ao `current_list_trello_id`
- **Solução:** Corrigir o `current_list_id` para o valor correto

### 3. **Card Órfão** (`orphaned_card`)
- Card tem `current_list_trello_id` que não existe mais na tabela `lists`
- **Solução:** Limpar a referência inválida

### 4. **Sem Referência de List** (`no_list_reference`)
- Card não tem nem `current_list_id` nem `current_list_trello_id`
- **Solução:** Investigar origem do problema

## 📊 Exemplo de Saída

```
🔍 Iniciando verificação de relacionamentos entre cards e lists...

📋 Obtendo ID do board...
✅ Board encontrado: Meu Board (ID: 123e4567-e89b-12d3-a456-426614174000)

📋 Carregando lists do board...
✅ 5 lists carregadas
  📋 A Receber (Trello ID: 64f8a1b2c3d4e5f6a7b8c9d0, DB ID: 456e7890-e89b-12d3-a456-426614174000)
  📋 Em Processamento (Trello ID: 64f8a1b2c3d4e5f6a7b8c9d1, DB ID: 567e8901-e89b-12d3-a456-426614174000)
  ...

🃏 Carregando cards do board...
✅ 150 cards carregados

🔍 Verificando relacionamentos...
✅ Verificação concluída. 23 problemas encontrados

📊 RELATÓRIO DE PROBLEMAS ENCONTRADOS
================================================================================
📈 ESTATÍSTICAS:
  List ID ausente: 20 cards
  List ID incorreto: 3 cards

🔧 Aplicando correções...
📋 Executando backfill automático...
✅ Backfill automático executado com sucesso

🔍 Verificando relacionamentos após as correções...
🎉 PERFEITO! Todos os relacionamentos foram corrigidos com sucesso!

🏁 Verificação e correção concluídas!
```

## ⚠️ Considerações Importantes

1. **Backup:** Sempre faça backup antes de executar correções em massa
2. **Teste:** Execute primeiro em um ambiente de teste
3. **Monitoramento:** Verifique os logs para identificar possíveis problemas
4. **Integridade:** As correções mantêm a integridade referencial

## 🔧 Função RPC Existente

O banco já possui uma função `backfill_card_list_id` que:
- Recebe um `board_id` como parâmetro
- Atualiza automaticamente o `current_list_id` baseado no `current_list_trello_id`
- É executada automaticamente pelos scripts

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Confirme que as credenciais do Supabase estão corretas
3. Verifique se o board existe e tem cards
4. Execute primeiro as queries SQL para diagnóstico

## 🎯 Resultado Esperado

Após a execução bem-sucedida:
- ✅ Todos os cards terão `current_list_id` correto
- ✅ Os relacionamentos estarão sincronizados
- ✅ O dashboard funcionará corretamente
- ✅ As consultas por list funcionarão sem problemas
