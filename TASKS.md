# RITMO — Acompanhamento do desenvolvimento

Legenda: `[ ]` a fazer · `[~]` em andamento · `[x]` concluído e verificado · `[!]` bloqueado

Uma tarefa só recebe `[x]` depois de: testes passando, `tsc` sem erros, lint limpo e fluxo
principal exercitado no navegador. Visão, arquitetura e decisões: [`PROJECT.md`](PROJECT.md).

As fases 2 a 6 estão em nível de entrega; cada uma é detalhada em tarefas menores quando começa.

## Fase 0 — Planejamento

- [x] Analisar o repositório e o ambiente local
- [x] Registrar o briefing do produto em `docs/BRIEF.md`
- [x] Arquitetura, estrutura de pastas, fluxos e roadmap em `PROJECT.md`
- [~] Modelo de dados: `docs/DATABASE.md` + schema Prisma validado (worker Orca)
- [~] Design system: `docs/DESIGN_SYSTEM.md` + referência visual (worker Orca)
- [ ] Consolidar os relatórios dos workers em `PROJECT.md`
- [ ] **Aprovação do plano pelo dono do produto**

## Prévia de frontend (adiantada a pedido do dono do produto)

Telas construídas contra uma **API simulada no navegador** (MSW, só em desenvolvimento, rotulada
"Modo demonstração"). Os contratos Zod em `packages/shared` são os mesmos que a API real usará.
Verificado: `tsc` sem erros, ESLint sem erros, build de produção sem a camada de demo,
inspeção visual em desktop (escuro e claro) e em 390 px (iframe).

- [x] Tokens do design system, tema escuro/claro, fontes (Instrument Sans + Newsreader)
- [x] Shell responsivo: sidebar, navegação inferior mobile, captura rápida, paleta de comandos (Ctrl K)
- [x] Login e cadastro (React Hook Form + Zod)
- [x] Meu Dia: foco (até 3), timeline, carga × capacidade, reflexão diária
- [x] Tarefas: Kanban com arrastar e soltar + menu "mover para", lista com visões
- [x] Hábitos: calendário de consistência, sequência sem punição, dia excepcional
- [x] Objetivos: marcos, métrica ligada a reserva, aviso de objetivo parado
- [x] Finanças: reservado × disponível, gráfico, orçamento, novo lançamento, transferência neutra
- [x] Redesign do layout: painel principal "inset" sobre moldura, sidebar recolhível, hero do Meu Dia, foco em cartões, marcador "agora"
- [x] Agenda: dia/semana/mês, compromissos (sólidos) × tarefas com bloco (tracejadas), recorrência (diária, dias úteis, semanal), conflitos de horário, criar/editar/excluir, linha do "agora"
- [x] Projetos: lista com progresso, detalhe com tarefas do projeto, criar projeto, mudar status
- [x] Testes unitários (Vitest) do posicionamento dos blocos e dos intervalos da agenda (14 testes)
- [x] Visual liquid glass: vidro nas barras, botões, abas, campos, menus e diálogos; fundo neutro; indicador de vidro que desliza (sidebar, barra mobile, abas) com estica-e-assenta, mudança de cor por grupo e refração (Chromium)
- [x] Botão "Capturar" renomeado para "Adicionar" (atalho `A`)
- [ ] Atualizar `docs/DESIGN_SYSTEM.md` e `docs/design/preview.html`: o worker de design entregou uma direção sóbria ("tinta, papel e jade") que não é a do vidro colorido pedido depois
- [ ] Ainda não verificado no navegador: arrastar cartão do Kanban com o mouse, criar/excluir compromisso até o fim, tema claro nas demais telas, refração em Safari/Firefox (caem para vidro fosco)
- [ ] Pendente da Fase 2: arrastar e soltar na agenda e na timeline, editar tarefa, exceções de uma ocorrência recorrente
- [ ] Testes de componente e ponta a ponta (Testing Library/Playwright) ainda não escritos

## Fase 1 — Foundation

Configuração
- [ ] Monorepo npm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- [ ] TypeScript strict, ESLint e Prettier compartilhados; scripts `dev`, `build`, `lint`, `typecheck`, `test`
- [ ] Variáveis de ambiente validadas com Zod; `.env.example`
- [ ] Dockerfiles + `docker-compose.yml` (marcar como não verificado enquanto não houver Docker)

Banco de dados
- [ ] Bancos `ritmo` e `ritmo_test` no MariaDB local
- [ ] Schema Prisma da fase: usuário, sessões, preferências, áreas, módulos ativos
- [ ] Primeira migração + seed dos dados padrão por usuário

API
- [ ] Base do Express: tratador central de erros, validação, logger, `helmet`, CORS, rate limit
- [ ] Autenticação: cadastro, login, refresh rotativo, logout, usuário atual
- [ ] Middleware de autenticação e padrão de autorização por `userId`
- [ ] Módulos `users` (perfil, preferências), `areas`, `settings`
- [ ] Testes de integração: autenticação e isolamento entre usuários

Web
- [ ] Vite + React + Tailwind v4 + shadcn/ui com os tokens do design system
- [ ] Temas escuro (padrão) e claro, com preferência salva
- [ ] Cliente HTTP com renovação de sessão; TanStack Query; rotas protegidas
- [ ] Telas de cadastro e login (validação, erro, carregamento)
- [ ] Shell desktop (sidebar, cabeçalho) e shell mobile (navegação inferior, menu)
- [ ] Rotas de todos os módulos ativos com estado vazio real (sem dados fictícios)
- [ ] Configurações: perfil, tema, fuso, módulos ativos, áreas

Fechamento
- [ ] Testes, typecheck e lint verdes
- [ ] Revisão da interface: desktop e mobile, escuro e claro
- [ ] Fluxo ponta a ponta: cadastro → login → navegação → logout
- [ ] Atualizar `TASKS.md` e o registro de decisões

## Fase 2 — Core Productivity

- [ ] Tarefas: CRUD completo, checklist, tags, prioridade, estimativa, recorrência
- [ ] Visualizações: lista, hoje, próximas, atrasadas, concluídas, calendário
- [ ] Kanban: quadro padrão, quadros e colunas personalizados, arrastar e soltar
- [ ] Projetos e vínculo tarefa → projeto
- [ ] Agenda: dia, semana e mês; compromissos; duração; conflitos; arrastar; navegação entre datas
- [ ] Recorrência (RRULE) com exceções, coberta por testes unitários
- [ ] Registro de tempo (`TimeEntry`) e cronômetro em tarefa
- [ ] Meu Dia: cabeçalho, resumo, timeline, foco do dia (até 3), progresso, carga × capacidade
- [ ] Reflexão diária e histórico
- [ ] Captura rápida global + caixa de entrada para classificar depois
- [ ] Fechamento da fase

## Fase 3 — Personal Development

- [ ] Objetivos: marcos, estratégias de progresso, histórico, filtros por status e categoria
- [ ] Visão 2027
- [ ] Hábitos: frequência, check-in, pausa, dia excepcional, calendário de consistência, tendências
- [ ] Integração hábito/tarefa/evento → objetivo
- [ ] Estudos: trilhas, módulos, aulas, materiais, sessão com cronômetro, metas semanais, relatórios
- [ ] Dev Space: projetos de desenvolvimento, roadmap visual, cursos, desafios, ideias
- [ ] Inglês: vocabulário, frases, prática por habilidade, metas semanais
- [ ] Leitura: biblioteca, progresso, registros de leitura, citações e anotações
- [ ] Saúde: divisões de treino, exercícios, registro de treinos e caminhadas, frequência
- [ ] Espiritualidade: devocional, leituras bíblicas, pedidos e registros de oração, metas de leitura
- [ ] Fechamento da fase

## Fase 4 — Financial Management

- [ ] Contas e reservas (reservado × disponível)
- [ ] Movimentações: receita, despesa, transferência, aporte, resgate
- [ ] Categorias e orçamento mensal (planejado × realizado × disponível)
- [ ] Objetivos financeiros: aportes planejados, histórico, projeção de conclusão
- [ ] Painel financeiro e relatórios (fluxo de caixa, comparativo mensal, reservas, patrimônio manual)
- [ ] Testes de saldo e de transferências
- [ ] Fechamento da fase

## Fase 5 — Intelligence

- [ ] Revisão semanal: métricas da semana, perguntas, prioridades, resumo salvo
- [ ] Revisão mensal
- [ ] Motor de insights determinísticos + área Insights
- [ ] Distribuição de tempo por área e relatórios de evolução
- [ ] Fechamento da fase

## Fase 6 — Polish

- [ ] PWA: manifest, ícones, service worker, instalação, comportamento offline definido
- [ ] Central de notificações, preferências e agendador de lembretes; base para web push
- [ ] Exportação dos dados do usuário
- [ ] Acessibilidade: teclado, foco, contraste, leitores de tela
- [ ] Performance: divisão de código, consultas e índices revisados
- [ ] Testes ponta a ponta dos fluxos principais (desktop e mobile)
- [ ] Revisão completa de UX
- [ ] Verificar Docker Compose em uma máquina com Docker

## Pendências com o dono do produto

- [ ] Aprovar o plano (ou pedir ajustes)
- [ ] Informar usuário e senha do MariaDB local para criar os bancos de desenvolvimento e teste
- [ ] Definir se os commits podem ser feitos e enviados ao GitHub ao fim de cada fase
