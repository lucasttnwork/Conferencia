# 🧱 Trello → Supabase Sync

Sincronização completa de dados do Trello para Supabase com parsing inteligente de descrições padronizadas.

## 📋 Pré-requisitos

1. **Node.js** (versão 16+)
2. **Acesso ao Supabase** (Service Role Key)
3. **Acesso ao Trello** (API Key + Token)
4. **Board ID do Trello** para sincronizar

## 🚀 Setup Inicial

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `env.example` para `.env` e preencha com suas credenciais:

```bash
cp env.example .env
```

### 3. Criar esquema no Supabase
Execute o arquivo `schema.sql` no SQL Editor do Supabase:

```sql
-- Copie e cole o conteúdo de schema.sql no SQL Editor
-- Execute todas as queries para criar as tabelas
```

## 🔧 Estrutura do Projeto

```
src/
├── lib/
│   ├── env.ts          # Configuração de ambiente
│   ├── http.ts         # Cliente HTTP (Trello + Supabase)
│   ├── parse.ts        # Parsers de dados
│   └── map.ts          # Utilitários
├── 01_seed_board_and_lists.ts
├── 02_index_card_ids_by_list.ts
└── 03_enrich_cards.ts
```

## 📊 Etapas de Sincronização

### Etapa 1: 🧱 Seed (Board + Listas)
```bash
npm run build
npm run seed
# ou em desenvolvimento:
npm run dev:seed
```

**O que faz:**
- Busca dados do board no Trello
- Salva board no Supabase
- Busca todas as listas do board
- Salva listas no Supabase

### Etapa 2: 🗂️ Indexação (IDs dos Cards)
```bash
npm run index
# ou em desenvolvimento:
npm run dev:index
```

**O que faz:**
- Para cada lista, busca IDs dos cards
- Salva dados mínimos dos cards (sem detalhes)
- Prepara para enriquecimento posterior

### Etapa 3: 🔎 Enriquecimento (Detalhes + Parsing)
```bash
npm run enrich
# ou em desenvolvimento:
npm run dev:enrich
```

**O que faz:**
- Busca cards pendentes de enriquecimento
- Obtém detalhes completos de cada card
- Parseia descrição padronizada
- Extrai protocol_number do nome
- Salva dados enriquecidos

## 📝 Formato da Descrição Padronizada

O sistema espera cards com descrição no formato:

```
📆 Recebido em: 15/12/2023 14:30
👤 Escrevente: João Silva
💼 Natureza: Escritura Pública
💰 Valor: 1.234,56
📧 E-mail: joao.silva@cartorio.com
Reconferência: sim
```

**Campos extraídos:**
- `received_at`: Data/hora de recebimento
- `clerk_name`: Nome do escrevente
- `act_type`: Tipo de ato
- `act_value`: Valor monetário (BRL)
- `clerk_email`: E-mail do escrevente
- `reconference`: Boolean (sim/nao)

## 🔄 Idempotência

- Todos os upserts usam `trello_id` como chave única
- Pode executar as etapas múltiplas vezes sem duplicação
- Etapa 3 só processa cards pendentes por padrão

## 📈 Monitoramento

Cada etapa exibe logs detalhados:
- Contagem de itens processados
- Progresso em tempo real
- Erros com contexto completo

## 🚨 Tratamento de Erros

- Rate limiting do Trello (429)
- Timeouts de rede
- Validação de dados obrigatórios
- Rollback automático em caso de falha

## 🔧 Configuração Avançada

### Lotes Personalizados
Edite `src/lib/map.ts` para ajustar tamanhos de lote:

```typescript
export function chunk<T>(arr: T[], size = 300): T[][] {
  // Ajuste o size conforme necessário
}
```

### Concorrência Limitada
Descomente em `src/03_enrich_cards.ts`:

```typescript
import pLimit from 'p-limit';
const limit = pLimit(5); // 5 requisições simultâneas
```

### Filtros Personalizados
Modifique queries no Supabase para processar apenas cards específicos.

## 📊 Próximos Passos

1. **Webhook em tempo real** para sincronização automática
2. **Dashboard de produtividade** com views SQL
3. **Sincronização de membros** e labels
4. **Histórico de movimentações** para analytics

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

<<<<<<< HEAD
MIT License - veja o arquivo LICENSE para detalhes. 

## 🌐 Deploy (Hostinger / VPS genérica)

Pré-requisitos:
- Node.js 18+ instalado no servidor
- Variáveis de ambiente configuradas (use `.env`)

Passos:
1. Clone o repositório
   ```bash
   git clone https://github.com/lucasttnwork/Conferencia.git
   cd Conferencia
   ```
2. Configure as variáveis copiando o exemplo
   ```bash
   cp env.example .env
   # edite .env com SUPABASE_URL e SUPABASE_ANON_KEY etc.
   ```
3. Instale (o build roda no postinstall)
   ```bash
   npm install
   ```
4. Inicie o servidor
   ```bash
   npm start
   # ou: PORT=8080 npm start
   ```

Notas:
- O servidor customizado `server.js` escuta em `0.0.0.0:${PORT}`.
- Em Hostinger, crie uma aplicação Node apontando para `server.js` e configure as variáveis no painel.
=======
MIT License - veja o arquivo LICENSE para detalhes. 
>>>>>>> 9faaeadc2d8cb04ceb8537caaf5c55b02cd64a6a
