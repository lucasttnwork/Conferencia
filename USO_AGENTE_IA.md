# Agente de IA para Extração de Informações dos Cards

## Descrição

O arquivo `05_card_info_extractor.ts` é um agente de IA que utiliza a API da OpenAI para extrair e normalizar informações dos cards do Trello, preenchendo automaticamente os campos estruturados no banco de dados do Supabase.

## Funcionalidades

### Campos Extraídos
O agente extrai as seguintes informações da descrição dos cards:

| Campo Original | Campo no Banco | Descrição |
|----------------|----------------|-----------|
| Escrevente | `clerk_name` | Nome da pessoa responsável |
| Natureza | `act_type` | Tipo do ato notarial |
| Valor | `act_value` | Valor monetário em reais |
| E-mail | `clerk_email` | Endereço de e-mail |
| Reconferência | `reconference` | Se há necessidade de reconferência (boolean) |

### Processo de Extração
1. **Busca no Banco**: Identifica cards que ainda não têm as informações extraídas
2. **API do Trello**: Obtém a descrição atualizada de cada card
3. **OpenAI**: Envia a descrição para normalização via IA
4. **Atualização**: Preenche os campos estruturados no Supabase

## Como Executar

### Pré-requisitos
- Node.js instalado
- Variáveis de ambiente configuradas (ver `.env.example`)
- API Key da OpenAI válida
- Acesso ao Supabase e Trello

### Execução
```bash
# Compilar TypeScript
npx tsc

# Executar o agente
node dist/05_card_info_extractor.js

# Ou executar diretamente com ts-node
npx ts-node src/05_card_info_extractor.ts
```

### Variáveis de Ambiente Necessárias
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Trello
TRELLO_KEY=...
TRELLO_TOKEN=...
```

## Saída do Console

O agente fornece feedback detalhado durante a execução:

```
🔍 Buscando cards sem informações extraídas...
📋 Encontrados 15 cards para processar

📝 Processando: "Protocolo 321400 - Escritura de Compra e Venda"
📋 Descrição do Trello obtida (245 caracteres)
✅ Informações extraídas:
   👤 Escrevente: João Silva
   💼 Natureza: Escritura de Compra e Venda
   💰 Valor: R$ 150000.00
   📧 E-mail: joao.silva@email.com
   🔍 Reconferência: Não

📊 Resumo:
- Cards processados: 15
- Cards com informações extraídas: 12
- Erros: 0
```

## Configuração da IA

### Prompt do Sistema
O agente usa um prompt especializado que:
- Define claramente os campos a serem extraídos
- Fornece regras para normalização de valores
- Solicita resposta em formato JSON estruturado
- Trata casos especiais (valores monetários, booleanos)

### Modelo OpenAI
- **Modelo**: GPT-4o-mini
- **Temperatura**: 0.1 (baixa para consistência)
- **Tokens máximos**: 500
- **Formato**: JSON estruturado

## Tratamento de Erros

- **Parse JSON**: Se a OpenAI retornar JSON inválido, os campos ficam null
- **API Errors**: Logs detalhados de erros da OpenAI e Trello
- **Validação**: Verifica se as informações extraídas são válidas antes de salvar
- **Continuidade**: Continua processando outros cards mesmo com erros

## Performance e Limitações

- **Rate Limiting**: Pausa de 1 segundo entre cards para não sobrecarregar APIs
- **Processamento em Lote**: Processa todos os cards pendentes de uma vez
- **Resiliente**: Continua funcionando mesmo com falhas parciais
- **Logs Detalhados**: Facilita debugging e monitoramento

## Casos de Uso

### Uso Inicial
- Executar uma vez para processar todos os cards existentes
- Preencher campos vazios com informações estruturadas

### Uso Contínuo
- Executar periodicamente para novos cards
- Manter sincronização entre Trello e banco estruturado

### Manutenção
- Reexecutar para cards que falharam na primeira tentativa
- Atualizar informações quando descrições mudarem no Trello

## Monitoramento

### Métricas Importantes
- Total de cards processados
- Taxa de sucesso na extração
- Tempo de processamento
- Erros por tipo de falha

### Logs para Debug
- Respostas da OpenAI
- Erros de parse JSON
- Falhas de API
- Cards sem descrição

## Segurança

- API Key da OpenAI deve ser mantida segura
- Acesso ao Supabase via service role (apenas para operações necessárias)
- Logs não expõem dados sensíveis dos cards
- Validação de entrada antes de salvar no banco
