# 🚀 Guia de Uso - Trello → Supabase Sync

## 📋 Setup Inicial

### 1. Configure as variáveis de ambiente
```bash
cp env.example .env
# Edite o arquivo .env com suas credenciais
```

### 2. Execute o esquema SQL no Supabase
- Vá para o SQL Editor do Supabase
- Cole e execute o conteúdo de `schema.sql`
- Isso criará todas as tabelas necessárias

### 3. Instale as dependências e compile
```bash
npm install
npm run build
```

## 🔄 Execução das Etapas

### Etapa 1: Seed (Board + Listas)
```bash
npm run seed
```

**Logs esperados:**
```
🚀 Iniciando Etapa 1: Seed do board e listas...
📋 Buscando dados do board no Trello...
Board encontrado: Nome do Board (67e44cc54b8865ef73dcacac)
✅ Board salvo no Supabase
📋 Buscando listas do board...
Encontradas 5 listas
✅ 5 listas salvas no Supabase
🎉 Seed concluído: board + listas sincronizados!
```

### Etapa 2: Indexação (IDs dos Cards)
```bash
npm run index
```

**Logs esperados:**
```
🚀 Iniciando Etapa 2: Indexação dos IDs dos cards...
📋 Buscando listas do board...
Encontradas 5 listas para indexar
📋 Indexando cards da lista: To Do (lista_id)
✅ Indexados 15 cards da lista To Do
📋 Indexando cards da lista: Em Andamento (lista_id)
✅ Indexados 8 cards da lista Em Andamento
...
🎉 Indexação concluída. Total cards indexados (mínimo): 45
```

### Etapa 3: Enriquecimento (Detalhes + Parsing)
```bash
npm run enrich
```

**Logs esperados:**
```
🚀 Iniciando Etapa 3: Enriquecimento dos cards...
📋 Buscando cards pendentes de enriquecimento...
Cards pendentes: 45
📋 Processando lote de 200 cards...
✅ Enriquecidos: +200 (total 200)
📋 Processando lote de 200 cards...
✅ Enriquecidos: +200 (total 400)
...
🎉 Enrichment concluído.
```

## 📊 Verificação dos Dados

### No Supabase Dashboard
1. Vá para **Table Editor**
2. Verifique as tabelas:
   - `boards` - 1 registro
   - `lists` - N registros (uma por lista)
   - `cards` - N registros (um por card)

### Consultas SQL de Verificação

```sql
-- Contar cards por lista
SELECT 
  l.name as lista,
  COUNT(c.id) as total_cards,
  COUNT(CASE WHEN c.name IS NOT NULL THEN 1 END) as cards_enriquecidos
FROM lists l
LEFT JOIN cards c ON l.trello_id = c.current_list_trello_id
GROUP BY l.id, l.name
ORDER BY l.pos;

-- Cards com dados parseados
SELECT 
  name,
  protocol_number,
  clerk_name,
  act_type,
  act_value,
  received_at
FROM cards 
WHERE protocol_number IS NOT NULL
LIMIT 10;

-- Resumo de valores
SELECT 
  COUNT(*) as total_cards,
  COUNT(protocol_number) as com_protocolo,
  COUNT(clerk_name) as com_escrevente,
  COUNT(act_value) as com_valor,
  SUM(act_value) as valor_total
FROM cards;
```

## 🔧 Troubleshooting

### Erro: "Board não encontrado"
```bash
# Execute a Etapa 1 primeiro
npm run seed
```

### Erro: "Rate limit exceeded"
```bash
# Aguarde alguns minutos e tente novamente
# O Trello tem limite de 300 requests/minuto
```

### Erro: "Supabase connection failed"
```bash
# Verifique as credenciais no .env
# Certifique-se de usar a Service Role Key
```

### Cards não estão sendo enriquecidos
```bash
# Verifique se os cards têm descrição no formato correto:
📆 Recebido em: 15/12/2023 14:30
👤 Escrevente: João Silva
💼 Natureza: Escritura Pública
💰 Valor: 1.234,56
📧 E-mail: joao.silva@cartorio.com
Reconferência: sim
```

## 🔄 Reexecução

### Para reprocessar todos os cards
```bash
# Edite src/03_enrich_cards.ts e remova o filtro:
# or=(name.is.null,description.is.null)
# Para processar todos os cards novamente
```

### Para limpar e começar do zero
```sql
-- No SQL Editor do Supabase:
DELETE FROM card_movements;
DELETE FROM card_labels;
DELETE FROM card_members;
DELETE FROM cards;
DELETE FROM labels;
DELETE FROM lists;
DELETE FROM members;
DELETE FROM boards;
```

## 📈 Monitoramento

### Logs em tempo real
```bash
# Para ver logs mais detalhados, execute em desenvolvimento:
npm run dev:seed
npm run dev:index
npm run dev:enrich
```

### Métricas importantes
- **Total de cards**: Deve corresponder ao Trello
- **Cards enriquecidos**: Com name e description preenchidos
- **Protocolos extraídos**: Cards com protocol_number
- **Valores parseados**: Cards com act_value

## 🚀 Próximos Passos

1. **Webhook em tempo real** para sincronização automática
2. **Dashboard de produtividade** com views SQL
3. **Sincronização de membros** e labels
4. **Histórico de movimentações** para analytics

---

**💡 Dica**: Execute as etapas em sequência e verifique os logs para garantir que tudo está funcionando corretamente! 