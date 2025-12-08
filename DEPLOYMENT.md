# Guia de Deploy na Railway

Este projeto está pronto para ser implantado na Railway. Siga os passos abaixo para configurar o ambiente de produção.

## 1. Configuração do Repositório
Certifique-se de que o código está em um repositório Git (GitHub, GitLab, etc.).

## 2. Criar Projeto na Railway
1. Acesse o dashboard da railway.app.
2. Clique em "New Project" -> "Deploy from GitHub repo".
3. Selecione o repositório deste projeto.

## 3. Variáveis de Ambiente
Antes ou logo após o deploy inicial (que pode falhar se faltarem chaves), você deve configurar as variáveis de ambiente. Vá na aba "Variables" do seu serviço na Railway e adicione as seguintes chaves (copie os valores do seu `.env` local ou gere novos para produção de acordo com a necessidade):

### Configuração do Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_PUBLIC_KEY`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configuração do Trello
- `TRELLO_API_KEY`: Sua chave de API do Power-Up.
- `TRELLO_API_TOKEN`: Seu token pessoal ou de serviço.
- `TRELLO_BOARD_ID`: ID do quadro onde os cards serão criados/monitorados.
- `TRELLO_TRIAGEM_LIST_ID`: ID da lista "Triagem" (O padrão `6866abc12d1dd317b1f980b0` será usado se não informado).
- `TRELLO_MODELS_LIST_ID`: ID da lista "Modelos" (O padrão `67e44ff774af21759836b4cc` será usado se não informado).
- `TRELLO_WEBHOOK_CALLBACK_URL`: A URL completa do endpoint de webhook na Railway. 
  - Exemplo: `https://seu-projeto-railway.railway.app/api/trello/webhook`
- `TRELLO_API_SECRET`: Secret da API do Trello para validação de assinatura de webhooks.
- `TRELLO_ALLOW_UNVERIFIED`: Defina como `false` em produção para garantir segurança.

## 4. Comandos de Build e Start
A Railway detecta automaticamente projetos Next.js, mas para garantir:
- **Build Command**: `npm run build` (ou `next build`)
- **Start Command**: `npm start` (que roda `node server.js`)

## 5. Webhooks
Após o deploy, certifique-se de que o webhook do Trello está apontando corretamente para o domínio da Railway. Você pode precisar rodar um script localmente ou criar uma rota de administração para registrar o webhook com a nova URL da Railway.
