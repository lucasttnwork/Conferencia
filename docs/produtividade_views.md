## Views de Produtividade (Supabase)

Este documento resume as views criadas/atualizadas no Supabase para suportar o dashboard de produtividade por membro, considerando somente cards abertos e o tipo de ato. Use-o como referência rápida para continuar o desenvolvimento do frontend.

### Escopo e princípios
- Apenas cards abertos (não arquivados) entram nas métricas dos agregados do dashboard.
- A produtividade por membro é derivada de `member_activity` (consolida movimentos e eventos relevantes do Trello).
- Tipos de ato: atualmente o join é por nome (`act_type.name = member_activity.act_type`). Se um `act_type_id` for introduzido em `cards`/`member_activity`, basta trocar os joins para o ID.

---

### Views base do dashboard (resumo)
- `open_cards` (cards abertos com sua lista atual)
- `member_activity` (linha por evento de criação/movimentação/arquivamento/… por membro)

As views legadas do dashboard continuam disponíveis (todas filtrando cartões abertos):
- `dashboard_total_cards`, `dashboard_lists`, `dashboard_act_types`, `dashboard_list_breakdown`, `dashboard_list_pivot`, `dashboard_list_summary`

Permissões: todas com `GRANT SELECT TO anon` já aplicadas.

---

### Novas views de produtividade

#### 1) `prod_member_overview`
Agrega ações por membro em uma janela temporal (filtrar via `member_activity.occurred_at`).

Colunas principais:
- `member_id`, `member_username`, `member_fullname`
- `total_actions`, `created`, `moved`, `archived`, `unarchived`, `deleted`
- `first_action_at`, `last_action_at`

REST (exemplos):
```bash
GET ${SUPABASE_URL}/rest/v1/prod_member_overview?select=*&order=total_actions.desc
```

Para filtrar por período, consulte primeiro `member_activity` e agregue no frontend (ou crie endpoints internos que apliquem `occurred_at=gte/lte`). Exemplo de filtro direto na base (quando necessário):
```bash
GET ${SUPABASE_URL}/rest/v1/member_activity?select=member_id,member_username,member_fullname,action_type,occurred_at&occurred_at=gte.${FROM}&occurred_at=lte.${TO}
```

#### 2) `prod_member_by_act_type`
Distribuição de produtividade por membro e por tipo de ato.

Colunas principais:
- `member_id`, `member_username`, `member_fullname`
- `act_type_name`
- `created`, `moved`, `total_actions`

REST:
```bash
GET ${SUPABASE_URL}/rest/v1/prod_member_by_act_type?select=*&order=total_actions.desc
```

Uso típico no dashboard:
- Tabelas resumo “Top membros por tipo de ato”
- Gráficos de barras horizontais empilhadas (por membro, cores por tipo de ato)

#### 3) `prod_member_flows`
Maiores fluxos por membro (de `from_list` → `to_list`) com composição por tipo de ato.

Colunas principais:
- `member_id`, `member_username`, `member_fullname`
- `from_list_id`, `from_list_name`, `to_list_id`, `to_list_name`
- `act_type_name`
- `moved` (quantidade de cards movidos neste fluxo e tipo)

REST:
```bash
GET ${SUPABASE_URL}/rest/v1/prod_member_flows?select=*&order=moved.desc
```

Uso típico no dashboard:
- Tabela de “Maiores fluxos por membro” (linha por fluxo, badges por tipo de ato)
- Visualização de rede/cordas (opcional) ou tabela com grupos por `member_fullname`

---

### Como filtrar por período (frontend / API interna)
As views agregadas acima não possuem `occurred_at`. Para filtros de período, leia os registros cru de `member_activity` com:
```bash
GET ${SUPABASE_URL}/rest/v1/member_activity?select=*&occurred_at=gte.${FROM}&occurred_at=lte.${TO}
```
e então:
- Agregue no servidor (rota Next `/api/produtividade`) para produzir exatamente os formatos de `prod_member_overview`, `prod_member_by_act_type` e `prod_member_flows` respeitando o período.
- Alternativa: criar materialized views parametrizadas ou views específicas com `WHERE occurred_at BETWEEN …` (menos flexível).

Exemplo simples de agregação no servidor (pseudo-código):
```ts
const rows = await fetch(`${SUPABASE_URL}/rest/v1/member_activity?...from/to...`)
// groupBy member → compute counts
// groupBy member+act_type → compute distribuição
// groupBy member+from→to (+act_type) → compute fluxos
return { overview, byActType, flows }
```

---

### Exemplos de componentes (sugestões)
- “Ações por membro” (tabela): usa `overview` (ou `prod_member_overview`) com colunas Total/Criações/Movimentações/Arquivados.
- “Movimentações por tipo de ato (por membro)” (tabela + chips): usa `byActType` (ou `prod_member_by_act_type`).
- “Maiores fluxos por membro (origem → destino)” (tabela): usa `flows` (ou `prod_member_flows`).

Gráficos possíveis:
- Barras empilhadas por membro (cores por tipo de ato) para `byActType`.
- Barras simples para “Top fluxos” (ordenado por `moved`).

---

### Permissões e notas operacionais
- Todas as views citadas foram criadas no schema `public` e receberam `GRANT SELECT TO anon`.
- Após alterações de schema/views, envie `NOTIFY pgrst, 'reload schema';` para o PostgREST recarregar o cache.

---

### Tabela de referência

- `open_cards`: cards abertos (id, name, act_type, act_value, clerk_name, current_list_id, list_name, list_position)
- `member_activity`: linhas de eventos por membro (create/move/archive/unarchive/delete), com `occurred_at`, nomes de listas e `act_type`
- `prod_member_overview`: totalizações por membro (total/created/moved/…)
- `prod_member_by_act_type`: distribuição por membro+tipo de ato
- `prod_member_flows`: fluxos por membro (from_list → to_list) e tipo de ato

---

### Ajustes futuros (se `act_type_id` for adicionado a `cards`/`member_activity`)
- Atualizar as views para usar `JOIN act_type at ON at.id = <coluna_id>` ao invés de `at.name = ma.act_type`.
- Incluir `act_type_id` nas colunas das views conforme necessário.


