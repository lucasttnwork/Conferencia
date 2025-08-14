# Dashboard de Cards - Trello

Um dashboard moderno e elegante para visualização em tempo real da distribuição dos cards do Trello, construído com Next.js, TypeScript e Tailwind CSS.

## 🚀 Características

- **Design Moderno**: Interface sofisticada no estilo Apple com gradientes e animações suaves
- **Tempo Real**: Atualização automática a cada 30 segundos
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Gráficos Interativos**: Visualizações usando Recharts
- **Estatísticas Detalhadas**: Breakdown completo por lista e tipo de ato
- **Performance Otimizada**: Construído com as melhores práticas do Next.js

## 📊 Funcionalidades

### 1. Visão Geral
- Total de cards
- Cards com/sem tipo de ato
- Cards com/sem escrevente
- Cards com valor monetário
- Valor total dos cards

### 2. Análise por Lista
- Quantidade de cards por lista
- Status de classificação (completude)
- Progresso visual com barras
- Ranking de organização

### 3. Distribuição por Tipo de Ato
- Gráfico de pizza interativo
- Top 5 tipos de ato
- Valores monetários por categoria
- Estatísticas detalhadas

### 4. Breakdown Detalhado
- Tabela completa por lista e tipo
- Percentuais de distribuição
- Valores monetários
- Análise de eficiência

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilização**: Tailwind CSS, CSS Variables
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Utilitários**: clsx, tailwind-merge

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/dashboard/route.ts    # API para dados do dashboard
│   ├── globals.css               # Estilos globais
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página principal
├── components/
│   ├── ui/                       # Componentes de UI reutilizáveis
│   ├── dashboard-header.tsx      # Header do dashboard
│   ├── stats-cards.tsx           # Cards de estatísticas
│   ├── lists-overview.tsx        # Visão geral das listas
│   ├── act-type-chart.tsx        # Gráfico de tipos de ato
│   └── list-breakdown.tsx        # Breakdown detalhado
├── lib/
│   └── utils.ts                  # Utilitários
├── dashboard_view.sql            # Views SQL para o dashboard
└── package.json                  # Dependências
```

## 🚀 Instalação

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie `env.dashboard.example` para `.env.local` e configure:
```bash
cp env.dashboard.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 3. Executar Views SQL
Execute o arquivo `dashboard_view.sql` no seu banco Supabase para criar as views necessárias.

### 4. Iniciar o Dashboard
```bash
npm run dev
```

O dashboard estará disponível em `http://localhost:3000`

## 📊 Views SQL

O dashboard utiliza as seguintes views do Supabase:

- `dashboard_lists`: Visão geral das listas
- `dashboard_act_types`: Tipos de ato e contagens
- `dashboard_list_breakdown`: Breakdown por lista e tipo
- `dashboard_stats`: View consolidada para todas as estatísticas

## 🎨 Design System

### Cores
- **Primária**: Azul (#3B82F6)
- **Sucesso**: Verde (#10B981)
- **Atenção**: Laranja (#F59E0B)
- **Erro**: Vermelho (#EF4444)
- **Secundária**: Roxo (#8B5CF6)

### Tipografia
- **Fonte**: SF Pro Display (fallback para system-ui)
- **Títulos**: Gradientes azul-roxo
- **Texto**: Hierarquia clara com diferentes pesos

### Componentes
- **Cards**: Bordas arredondadas com sombras suaves
- **Botões**: Estados hover e focus bem definidos
- **Gráficos**: Cores consistentes e tooltips informativos

## 🔄 Atualizações

- **Automática**: A cada 30 segundos
- **Manual**: Botão de refresh no header
- **Tempo Real**: Indicador de última atualização

## 📱 Responsividade

- **Desktop**: Layout em grid com 3 colunas
- **Tablet**: Layout adaptativo com 2 colunas
- **Mobile**: Layout em coluna única otimizado

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Outras Plataformas
```bash
npm run build
npm run start
```

## 🔧 Personalização

### Cores
Edite `tailwind.config.js` para alterar o esquema de cores.

### Componentes
Todos os componentes são modulares e podem ser facilmente customizados.

### Dados
Modifique a API em `app/api/dashboard/route.ts` para adicionar novas métricas.

## 📈 Próximas Funcionalidades

- [ ] Modo escuro
- [ ] Filtros avançados
- [ ] Exportação de relatórios
- [ ] Notificações em tempo real
- [ ] Dashboard administrativo
- [ ] Métricas de produtividade

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação
2. Abra uma issue no GitHub
3. Consulte os logs do console

---

**Desenvolvido com ❤️ usando Next.js e Tailwind CSS**
