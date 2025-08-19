# Diretrizes de Design do Dashboard

Este documento consolida o estilo visual, convenções de UI/UX e escolhas de frameworks utilizadas no dashboard. Ele deve ser usado como referência para evoluções futuras, garantindo consistência visual e de experiência.

## Fundamentos Visuais

- Tema escuro (dark) com gradiente sutil no fundo:
  - `bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900`.
- Estética “Liquid Glass” (inspiração iOS):
  - `backdrop-blur-2xl` + `bg-white/10` (hover: `bg-white/15`) + `border-white/15`.
  - Sombra de flutuação: `shadow-[0_8px_30px_rgba(0,0,0,0.35)]`.
- Cores de ênfase: paleta fria e viva para feedback (azul, verde, roxo, rosa) via Tailwind, ex.: `text-indigo-400`, `text-emerald-400`.
- Ícones: `lucide-react`, tamanhos `w-4 h-4`/`w-6 h-6`.
- Tipografia: `Inter` (definida em `app/layout.tsx`), títulos `font-bold`. Gradientes são usados pontualmente em headings principais.

## Frameworks e Bibliotecas

- Next.js (App Router) para estrutura e renderização.
- Tailwind CSS como sistema utilitário (tokens e responsividade).
- lucide-react para ícones.
- Recharts para gráficos (com gradientes SVG definidos localmente).

## Tokens e Primitivas

- Espaçamento: utilitários Tailwind (`p-*`, `m-*`, `gap-*`). Em containers, preferir `p-4 lg:p-6`.
- Raio dos cantos:
  - Controles: `rounded-full` ou `rounded-lg`.
  - Cartões/colunas: `rounded-xl`.
- Bordas:
  - Cartões: `border border-gray-700/50`.
  - Glass: `border-white/15`.
- Blur/opacidade (glass): `backdrop-blur-2xl` + `bg-white/10`.
- Sombras: `shadow-[0_8px_30px_rgba(0,0,0,0.35)]` para elementos flutuantes.

## Padrão de Cartão

Todos os blocos seguem:

```tsx
<div className="card">
  <div className="card-header">...</div>
  <div className="card-content">...</div>
</div>
```

- `card-header`: título, descrição e ações (toggles, filtros, etc.).
- `card-content`: conteúdo, podendo incluir `overflow-x-auto`/`overflow-y-auto` conforme necessário.
- Visual: fundo escuro translúcido, borda suave e cantos arredondados.

## Navegação Flutuante (SectionNav)

- Barra fixa, centralizada: `fixed top-6 left-1/2 -translate-x-1/2`.
- Estrutura com `pointer-events-none` no wrapper e `pointer-events-auto` no conteúdo.
- Grupo de páginas (Visão Geral / Produtividade) destacado em cápsulas glass:
  - Estado ativo: `bg-white/20` e borda leve.
- Itens de seção (anchors da página) ao lado, também em cápsulas glass.
- Para evitar sobreposição com títulos: páginas usam `pt-20 sm:pt-24` e cabeçalhos principais recebem `mt-16 sm:mt-20 lg:mt-24`.

## Botões e Controles

- Primários glass: `rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 transition-all`.
- Estados desabilitados: `disabled:opacity-50 disabled:cursor-not-allowed`.
- Toggles (mostrar/ocultar e expandir/colapsar) com o mesmo padrão glass.

## Padrão Kanban

Usado em:
- Distribuição por Lista – Kanban (Visão Geral).
- Movimentações por Tipo de Ato (por membro).
- Maiores Fluxos por Membro (origem → destino).

Características:
- Container com rolagem horizontal suave: `overflow-x-auto scroll-smooth`.
- Layout: `flex gap-4 pb-4 min-w-max`.
- Largura de colunas (referência):
  - Listas/Tipos por membro: `min-w-[18rem]`/`min-w-[20rem]`.
  - Fluxos por membro: `min-w-[22rem]` (labels longas).
- Cabeçalho: cápsula glass com ícone, título e metadados (ex.: total de movimentações).
- Item: cartão compacto `px-3 py-2` com `bg-gray-900/40` + `border-gray-700/50`, contagem à direita.
- Colunas com muitos itens: exibir no máx. 12 e oferecer “Ver todos/Ver menos”.

## Tabelas

- Usadas quando a leitura tabular agrega valor (ex.: Ações por membro).
- Cabeçalho `text-gray-400` e linhas com bordas discretas.
- Simplificar colunas sempre que possível (ex.: manter Total, Criações, Movimentações).

## Gráficos (Recharts)

- Gradientes SVG definidos no componente (`#actTypeGradient`, `#listGradient`).
- Barras com borda superior arredondada: `radius={[4,4,0,0]}`.
- Tooltips com fundo escuro translúcido e borda sutil.

## Layout e Responsividade

- Largura máxima: `max-w-7xl mx-auto`.
- Espaçamento vertical entre seções: `space-y-8`.
- Quebras responsivas via utilitários Tailwind (`sm:`, `md:`, `lg:`) mantendo boa legibilidade.

## Acessibilidade e UX

- Ícones com rótulos/aria quando aplicável.
- Contraste adequado no tema escuro (textos `text-gray-200/300` + cores de ênfase com parcimônia).
- Microinterações discretas: `transition-colors`/`transition-all`.

## Boas Práticas para Novos Componentes

1. Parta do padrão `card` (header/content).
2. Para ações, use cápsulas glass (botões, chips, filtros).
3. Em listagens horizontais, combine `overflow-x-auto` + `min-w-*` por coluna.
4. Ícones `lucide-react` com tamanhos padronizados e cores temáticas.
5. Evite excesso de bordas; prefira espaços e hierarquia tipográfica.
6. Em listas extensas, adote “Ver todos/Ver menos” ou paginação.

## Exemplos Rápidos

### Cápsula Glass (botão/pílula)
```tsx
<button className="rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-white/90 transition-all">
  Ação
</button>
```

### Coluna Kanban (esqueleto)
```tsx
<div className="min-w-[20rem] w-[20rem] flex-shrink-0">
  <div className="h-full flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/30">
    <div className="px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-700/50 rounded-t-xl">Cabeçalho</div>
    <div className="p-3 space-y-2">Itens…</div>
  </div>
</div>
```

## Checklist de Consistência

- [ ] Usa `card` com header/content.
- [ ] Navegação/controles com estilo glass.
- [ ] Espaçamento superior suficiente p/ não colidir com a navbar.
- [ ] Colunas Kanban com `overflow-x-auto` e `min-w-*` por coluna.
- [ ] Paleta, bordas e sombras coerentes com o tema escuro.
- [ ] Interações discretas e acessíveis.

---

Componentes atuais de referência: `SectionNav`, `DashboardHeader`, `VisualDistribution`, `ListKanban`, `MemberActTypeKanban`, `MemberFlowsKanban`.
