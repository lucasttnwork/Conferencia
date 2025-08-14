# 🤖 Agente de IA para Extração de Informações dos Cards

## Visão Geral

Este agente de IA foi desenvolvido para automatizar a extração e normalização de informações dos cards do Trello, utilizando a API da OpenAI para processar descrições em texto livre e convertê-las em dados estruturados no banco Supabase.

## 🎯 Objetivo

Transformar informações não estruturadas (presentes na descrição dos cards) em dados organizados e pesquisáveis, facilitando a análise e gestão dos processos notariais.

## 🔧 Como Funciona

### 1. Identificação de Cards
- Busca no banco por cards que ainda não têm as informações extraídas
- Filtra apenas cards com descrição preenchida

### 2. Coleta de Dados
- Acessa a API do Trello para obter descrições atualizadas
- Verifica se há conteúdo para processar

### 3. Processamento com IA
- Envia descrição para a OpenAI via API
- Utiliza prompt especializado para extração estruturada
- Recebe resposta em formato JSON

### 4. Atualização do Banco
- Valida dados extraídos
- Atualiza campos estruturados na tabela `cards`
- Registra timestamp de atualização

## 📊 Campos Extraídos

| Informação Original | Campo no Banco | Tipo | Exemplo |
|---------------------|----------------|------|---------|
| **Escrevente** | `clerk_name` | Texto | "João Silva" |
| **Natureza** | `act_type` | Texto | "Escritura de Compra e Venda" |
| **Valor** | `act_value` | Decimal | 150000.00 |
| **E-mail** | `clerk_email` | Texto | "joao@email.com" |
| **Reconferência** | `reconference` | Boolean | true/false |

## 🚀 Como Executar

### Pré-requisitos
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com suas chaves
```

### Execução
```bash
# Testar conexão com OpenAI
npx ts-node src/test_ai_agent.ts

# Executar agente completo
npx ts-node src/05_card_info_extractor.ts

# Ou compilar e executar
npx tsc
node dist/05_card_info_extractor.js
```

## ⚙️ Configuração

### Variáveis de Ambiente
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

### Configuração da IA
- **Modelo**: GPT-4o-mini
- **Temperatura**: 0.1 (baixa para consistência)
- **Tokens**: 500 (suficiente para respostas estruturadas)
- **Formato**: JSON obrigatório

## 📝 Exemplo de Uso

### Input (Descrição do Card)
```
Escrevente: Maria Santos
Natureza: Procuração Pública
Valor: R$ 50,00
E-mail: maria.santos@cartorio.com
Reconferência: não
```

### Output (Campos do Banco)
```json
{
  "clerk_name": "Maria Santos",
  "act_type": "Procuração Pública", 
  "act_value": 50.00,
  "clerk_email": "maria.santos@cartorio.com",
  "reconference": false
}
```

## 🔍 Monitoramento

### Logs de Execução
```
🔍 Buscando cards sem informações extraídas...
📋 Encontrados 25 cards para processar

📝 Processando: "Protocolo 321400 - Escritura"
📋 Descrição do Trello obtida (180 caracteres)
✅ Informações extraídas:
   👤 Escrevente: João Silva
   💼 Natureza: Escritura de Compra e Venda
   💰 Valor: R$ 150000.00
   📧 E-mail: joao.silva@email.com
   🔍 Reconferência: Não

📊 Resumo:
- Cards processados: 25
- Cards com informações extraídas: 22
- Erros: 0
```

### Métricas Importantes
- **Taxa de Sucesso**: Porcentagem de cards processados com sucesso
- **Tempo de Processamento**: Duração total da execução
- **Erros por Tipo**: Categorização de falhas para debugging

## 🛡️ Tratamento de Erros

### Tipos de Erro
1. **API OpenAI**: Falhas de conexão ou limite de tokens
2. **Parse JSON**: Respostas malformadas da IA
3. **API Trello**: Cards não encontrados ou sem descrição
4. **Supabase**: Falhas de atualização no banco

### Estratégias de Recuperação
- **Retry Automático**: Continua processando outros cards
- **Logs Detalhados**: Facilita identificação de problemas
- **Validação de Dados**: Verifica integridade antes de salvar
- **Fallback Graceful**: Campos ficam null em caso de falha

## 📈 Performance

### Otimizações
- **Rate Limiting**: Pausa de 1 segundo entre requests
- **Processamento em Lote**: Todos os cards pendentes de uma vez
- **Validação Local**: Evita chamadas desnecessárias à IA
- **Cache de Respostas**: Não reprocessa cards já atualizados

### Limitações
- **API OpenAI**: Limite de requests por minuto
- **Trello**: Rate limiting da API externa
- **Supabase**: Limite de conexões simultâneas

## 🔄 Casos de Uso

### Uso Inicial
- Processar todos os cards existentes
- Preencher campos vazios com dados estruturados
- Estabelecer baseline de qualidade

### Uso Contínuo
- Executar periodicamente (diário/semanal)
- Processar novos cards automaticamente
- Manter sincronização com Trello

### Manutenção
- Reexecutar para cards que falharam
- Atualizar informações quando descrições mudarem
- Monitorar qualidade da extração

## 🧪 Testes

### Teste de Conexão
```bash
npx ts-node src/test_ai_agent.ts
```

### Teste de Extração
- Criar card de teste no Trello
- Executar agente
- Verificar campos preenchidos no Supabase

## 📚 Documentação Adicional

- [USO_AGENTE_IA.md](./USO_AGENTE_IA.md) - Guia detalhado de uso
- [schema.sql](./schema.sql) - Estrutura do banco de dados
- [README.md](./README.md) - Documentação geral do projeto

## 🤝 Contribuição

### Melhorias Sugeridas
- Adicionar mais campos para extração
- Implementar cache de respostas da OpenAI
- Criar dashboard de monitoramento
- Adicionar testes automatizados

### Reportar Problemas
- Verificar logs de execução
- Validar configuração das APIs
- Testar com cards de exemplo
- Documentar cenários de erro

## 📄 Licença

Este projeto é parte do sistema de gestão notarial e está sujeito às políticas internas da organização.
