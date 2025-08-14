### Dashboard de Atos Notariais (Next.js + Supabase)

Este projeto é um dashboard em Next.js 14 que consome dados de views no Supabase para apresentar estatísticas em tempo real sobre cards/listas. A aplicação oferece visão geral, distribuição por tipos de ato, insights rápidos e tabelas (pivot e detalhada) por lista.

### Principais links
- **Produção (Railway)**: [conferencia-production-e880.up.railway.app](https://conferencia-production-e880.up.railway.app)

### Arquitetura
- **Frontend/SSR**: Next.js App Router (`app/`), TailwindCSS, componentes React.
- **API interna**: `GET /api/dashboard` em `app/api/dashboard/route.ts` agrega dados vindos do Supabase REST.
- **Dados**: Views no Supabase expostas via REST (`/rest/v1`), autenticadas com `SUPABASE_ANON_KEY`.

### Requisitos
- Node.js 18+ (recomendado LTS)
- Conta e projeto no Supabase com as views do arquivo `dashboard_view.sql` criadas

### Variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto (`Conferencia/.env`) baseado em `env.dashboard.example`:

```bash
SUPABASE_URL=seu_supabase_url
SUPABASE_ANON_KEY=sua_chave_anon_do_supabase

# Opcional (exposição no client, se necessário)
NEXT_PUBLIC_SUPABASE_URL=seu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### Execução local
1. Instale as dependências:
```bash
npm install
```
2. (Opcional) Build de produção:
```bash
npm run build
```
3. Desenvolvimento (porta 3000):
```bash
npm run dev
```
4. Produção (usando servidor HTTP customizado):
```bash
npm run start
```

### Fluxo de dados (Supabase)
A rota interna `GET /api/dashboard` lê as seguintes views via Supabase REST usando `SUPABASE_URL` e `SUPABASE_ANON_KEY`:
- **`dashboard_total_cards`**: totais gerais (cards, classificados, sem tipo, com escrevente, com valor, valor total, reconferência)
- **`dashboard_lists`**: resumo por lista (total e classificação)
- **`dashboard_act_types`**: agregados por tipo de ato (quantidade e valor total)
- **`dashboard_list_breakdown`**: detalhamento por lista e tipo de ato
- **`dashboard_list_pivot`**: uma linha por lista e colunas por tipo de ato (inclui métricas de completude)
- **`dashboard_list_summary`**: resumo executivo por lista

Essas views são definidas em `dashboard_view.sql`. Para criar/atualizar:
- Abra o SQL Editor do seu projeto Supabase
- Cole e execute o conteúdo de `dashboard_view.sql`

Observações importantes:
- As views estão no schema `public`. Garanta permissões de leitura para o papel anônimo (ou políticas RLS compatíveis) para que o `SUPABASE_ANON_KEY` consiga executar `SELECT` nessas views via REST.
- O endpoint REST do Supabase é resolvido a partir de `SUPABASE_URL`, no caminho `/rest/v1/<nome_da_view>?select=*`.

### API interna
- **Endpoint**: `GET /api/dashboard`
- **Retorno**:
```json
{
  "overall": { ... },
  "lists": [ ... ],
  "act_types": [ ... ],
  "breakdown": [ ... ],
  "pivot": [ ... ],
  "summary": [ ... ]
}
```
- **Falhas comuns**:
  - 500: variáveis `SUPABASE_URL`/`SUPABASE_ANON_KEY` ausentes
  - 401/404 ao consultar Supabase: falta de permissões ou views não criadas

### Interface (componentes principais)
- `components/dashboard-header.tsx`: cabeçalho, atualização manual
- `components/stats-overview.tsx`: cards de métricas gerais
- `components/visual-distribution.tsx`: gráficos de barras (listas e tipos)
- `components/quick-insights.tsx`: destaques e alertas
- `components/list-pivot-table.tsx`: visão pivot por lista
- `components/list-breakdown-table.tsx`: detalhamento por lista/tipo

### Estrutura de pastas
```
Conferencia/
  app/
    api/dashboard/route.ts
    globals.css, layout.tsx, page.tsx
  components/
    ... (componentes do dashboard)
  lib/utils.ts
  dashboard_view.sql
  env.dashboard.example
  next.config.js, postcss.config.js, tailwind.config.js
  package.json, package-lock.json
  server.js
  tsconfig.json, next-env.d.ts
```

### Deploy
- O projeto está em produção na Railway: [conferencia-production-e880.up.railway.app](https://conferencia-production-e880.up.railway.app)
- Para novos deploys, garanta que as variáveis de ambiente de produção (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) estão configuradas e que as views existem no banco apontado.

### Resolução de problemas
- **Tela “Carregando Dashboard” por muito tempo**: verifique `/api/dashboard` no navegador. Se 500, confira o `.env`. Se 401/404, verifique políticas/permissões e se as views foram criadas.
- **Aviso sobre lockfile no build**: a mensagem do Next sobre `patch-incorrect-lockfile` é inofensiva se o build finalizar OK.
- **CORS**: como o fetch ocorre no servidor (rota API), em geral não há impacto; se mover requisições para o client, poderá exigir configuração do Supabase.


