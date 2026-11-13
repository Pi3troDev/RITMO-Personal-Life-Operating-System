# RITMO — Personal Life Operating System

> Status: **planejamento — aguardando aprovação**. Nenhum código de aplicação foi escrito.
> Briefing original do produto: [`docs/BRIEF.md`](docs/BRIEF.md).
> Modelo de dados: [`docs/DATABASE.md`](docs/DATABASE.md) · Design system: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) · Acompanhamento: [`TASKS.md`](TASKS.md).

## 1. Visão

O RITMO é o lugar onde a pessoa começa o dia para entender suas prioridades e termina o dia para
avaliar sua execução. Ele responde, todos os dias, a uma pergunta:

**"Estou vivendo de acordo com aquilo que quero construir para o meu futuro?"**

Ele não é um gerenciador de tarefas com módulos extras. O produto é a **conexão** entre tempo,
dinheiro, conhecimento, projetos, hábitos e objetivos: uma sessão de estudo de inglês é, ao mesmo
tempo, um bloco na agenda, um registro de tempo, um check-in de hábito e um avanço em um objetivo.

### Princípios de produto

1. **Contexto integrado.** Toda atividade pode apontar para uma área da vida, um objetivo e um
   projeto. Nenhum módulo guarda seus dados em uma ilha.
2. **Execução antes de registro.** A tela "Meu Dia" é um painel de execução, não um relatório.
3. **Planejamento realista.** O sistema mostra a carga planejada contra a capacidade do dia e
   avisa quando ela estoura; não incentiva a lotar a agenda.
4. **Progresso sem julgamento.** Indicadores descrevem o que aconteceu; não avaliam a pessoa.
   Sequências não punem, hábitos podem ser pausados, dias excepcionais existem.
5. **Dados reais ou nada.** Insights saem apenas de dados registrados, por regras determinísticas.
   Sem mock em produção, sem botão decorativo, sem tela ilustrativa.
6. **Sem gamificação.** Nada de moedas, mascotes, rankings ou recompensas artificiais.

### Fora do escopo da primeira versão

Integração bancária, ensino por IA / LLM, revisão por repetição espaçada (apenas os campos ficam
previstos), envio real de web push (a arquitetura fica pronta), multi-moeda, colaboração entre
usuários, aplicativos nativos e idiomas além de pt-BR.

## 2. Análise do repositório (12/11/2026)

| Item | Situação |
| --- | --- |
| Conteúdo | Repositório vazio: apenas `.git`, branch `main` sem commits |
| Remoto | `origin` → `github.com/Pi3troDev/RITMO-Personal-Life-Operating-System` |
| Node / npm | Node 26.5, npm 11.17 |
| Banco local | Serviço **MariaDB** instalado e em execução no Windows |
| Docker | **Não instalado** nesta máquina |
| Outros | `gh` (GitHub CLI) e WSL disponíveis; sem pnpm/yarn |

Consequências:

- Não há código existente a preservar; a estrutura nasce do zero, conforme este documento.
- O desenvolvimento local usa o MariaDB nativo já instalado. `Dockerfile`s e `docker-compose.yml`
  serão entregues, mas **não podem ser testados nesta máquina** enquanto o Docker não existir —
  isso fica registrado como pendência explícita, não como item "concluído".
- Gerenciador de pacotes: npm workspaces (já disponível; sem dependência extra).

## 3. Arquitetura

### 3.1 Visão geral

```
┌────────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│  apps/web  (PWA)           │  ───────────────────────►   │  apps/api                    │
│  React + Vite + TypeScript │   /api/v1  (REST)           │  Express + TypeScript        │
│  TanStack Query (cache)    │  ◄───────────────────────   │  rotas → controller → service│
│  RHF + Zod (formulários)   │                             │  → repository (Prisma)       │
└─────────────┬──────────────┘                             └───────────────┬──────────────┘
              │                 packages/shared                            │
              └────────►  schemas Zod, tipos e constantes  ◄───────────────┘
                                                                           ▼
                                                                   MariaDB (InnoDB)
```

- **Monorepo** com npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- **Contrato único**: os schemas Zod de entrada e saída vivem em `packages/shared` e são usados
  pela API (validação) e pelo frontend (formulários e tipos). O contrato não é escrito duas vezes.
- **Regras de negócio só no servidor.** Progresso de objetivo, sequências de hábito, expansão de
  recorrência, saldos, orçamentos e insights são calculados em services da API. Componentes React
  apenas exibem e disparam ações.

### 3.2 Stack

| Camada | Tecnologia | Observação |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | SPA + PWA (`vite-plugin-pwa`) |
| UI | Tailwind CSS v4, shadcn/ui, Lucide | Tokens em CSS variables; tema escuro como padrão |
| Estado de servidor | TanStack Query | Cache, invalidação e atualizações otimistas |
| Rotas | React Router | Rotas protegidas e carregamento por módulo (code splitting) |
| Formulários | React Hook Form + Zod | Schemas vindos de `packages/shared` |
| Gráficos | Recharts | Único pacote de gráficos |
| Drag and drop | dnd-kit | Kanban, timeline do dia e agenda |
| Backend | Node.js, Express, TypeScript | Modular por domínio |
| ORM / banco | Prisma + MariaDB | Migrações versionadas; FKs reais |
| Validação | Zod | Na borda de toda rota |
| Autenticação | JWT de acesso curto + refresh rotativo | Detalhes em 3.5 |
| Testes | Vitest, Supertest, Testing Library, Playwright | Estratégia em 3.7 |
| Qualidade | ESLint, Prettier, `tsc --noEmit` (strict) | Mesma configuração nos três pacotes |
| Infra | Dockerfiles + Docker Compose, `.env` validado | Compose: `db`, `api`, `web` |

As versões exatas são fixadas no lockfile no início da Fase 1, usando a versão estável vigente de
cada pacote. Nenhuma biblioteca entra sem uso concreto na fase em que é instalada.

### 3.3 Estrutura de pastas

```
ritmo/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/
│  │  │  └─ seed.ts                  # dados padrão por usuário (áreas, quadro, categorias)
│  │  ├─ src/
│  │  │  ├─ server.ts                # sobe o processo
│  │  │  ├─ app.ts                   # monta o Express (testável sem rede)
│  │  │  ├─ config/env.ts            # variáveis de ambiente validadas com Zod
│  │  │  ├─ core/
│  │  │  │  ├─ errors/               # AppError + tratador central
│  │  │  │  ├─ middlewares/          # auth, validate, rate-limit, not-found
│  │  │  │  ├─ db/prisma.ts
│  │  │  │  ├─ time/                 # dia do usuário, fuso, intervalos
│  │  │  │  └─ logger.ts
│  │  │  ├─ modules/
│  │  │  │  └─ <dominio>/
│  │  │  │     ├─ <dominio>.routes.ts
│  │  │  │     ├─ <dominio>.controller.ts   # HTTP ↔ service; sem regra de negócio
│  │  │  │     ├─ <dominio>.service.ts      # regras de negócio
│  │  │  │     ├─ <dominio>.repository.ts   # Prisma, sempre filtrado por userId
│  │  │  │     └─ <dominio>.test.ts
│  │  │  └─ jobs/                    # agendador de lembretes (Fase 6)
│  │  └─ tests/                      # utilitários de integração (banco de teste, fábricas)
│  └─ web/
│     ├─ public/                     # ícones e manifest da PWA
│     └─ src/
│        ├─ app/                     # router, providers, layouts (desktop e mobile)
│        ├─ components/
│        │  ├─ ui/                   # shadcn/ui
│        │  └─ shared/               # componentes do RITMO reutilizados entre módulos
│        ├─ features/
│        │  └─ <dominio>/
│        │     ├─ api.ts             # chamadas + chaves do TanStack Query
│        │     ├─ hooks/
│        │     ├─ components/
│        │     └─ pages/
│        ├─ lib/                     # cliente HTTP, datas, formatação (moeda, duração)
│        └─ styles/                  # tokens do design system
├─ packages/
│  └─ shared/src/
│     ├─ schemas/                    # Zod: entrada e saída por domínio
│     ├─ constants/                  # enums, áreas padrão, limites
│     └─ index.ts
├─ docker/                           # Dockerfile.api, Dockerfile.web, nginx.conf
├─ docker-compose.yml
├─ docs/                             # BRIEF, DATABASE, DESIGN_SYSTEM
├─ PROJECT.md
└─ TASKS.md
```

Domínios da API (`modules/`), pela fase em que nascem:

| Fase | Módulos |
| --- | --- |
| 1 | `auth`, `users` (perfil e preferências), `areas`, `settings` (módulos ativos) |
| 2 | `tasks`, `boards`, `projects`, `events`, `agenda` (leitura agregada), `day` (resumo, foco, reflexão), `time-entries`, `inbox` (captura rápida) |
| 3 | `goals`, `vision`, `habits`, `study`, `dev`, `english`, `reading`, `health`, `spiritual` |
| 4 | `finance` (contas, movimentações, categorias, orçamentos, aportes, patrimônio, relatórios) |
| 5 | `reviews` (semanal e mensal), `insights`, `reports` |
| 6 | `notifications`, `export` |

Regras de arquitetura que valem para todo o código:

- Controller não contém regra de negócio; service não conhece `req`/`res`; repository não decide
  nada, apenas consulta.
- Repository só existe onde há consulta não trivial ou reutilizada; CRUD simples pode usar o
  Prisma direto no service, sempre com `userId` no filtro.
- Um componente React faz uma coisa. Página compõe; componente exibe; hook busca e muta.
- Nenhum arquivo com mais de uma responsabilidade clara; componentes grandes são divididos antes
  de crescer, não depois.

### 3.4 Modelo de dados

O desenho completo (entidades, relações, índices, diagramas e o schema Prisma validado) está em
[`docs/DATABASE.md`](docs/DATABASE.md). A espinha dorsal que torna os módulos integrados:

| Peça | Papel |
| --- | --- |
| `Area` | Áreas da vida do usuário (Trabalho, Estudos, Programação, Inglês, Academia, Espiritualidade, Leitura, Pessoal, Outros; editáveis). Uma única tabela usada por tarefas, eventos, hábitos, objetivos e registros de tempo — "como distribuo meu tempo" é uma consulta só. |
| `TimeEntry` | Registro unificado de tempo efetivamente dedicado, venha de onde vier (tarefa, sessão de estudo, programação, prática de inglês, treino, leitura). Alimenta "planejado × dedicado", a revisão semanal e os insights. |
| `Goal` + `Milestone` | Objetivo com marcos e estratégia de progresso explícita: manual, derivado dos marcos ou derivado de uma métrica (saldo de uma reserva, horas acumuladas, check-ins de hábito). Guarda histórico para mostrar evolução. Objetivo financeiro é um `Goal` ligado a uma conta-reserva. |
| `Task` × `Event` | Tarefa é trabalho flexível (pode ganhar um bloco na agenda); evento é compromisso com hora marcada. Ambos apontam para área, objetivo, projeto e hábito. |
| Recorrência | Regra RRULE guardada no item; ocorrências expandidas na leitura; só vira linha no banco a ocorrência concluída, movida ou cancelada. |
| Kanban | `Board` → `Column` → `Task` com posição. Cada coluna mapeia para uma categoria de status, então lista e Kanban nunca discordam. |
| Finanças | `Account` separa dinheiro **reservado** de **disponível**. Transferência entre contas próprias é uma linha com origem e destino e nunca entra como receita ou despesa. |

Princípios: todo registro pertence a um usuário (`userId`) e nunca é compartilhado; integridade por
chaves estrangeiras reais (sem pares polimórficos `tipo/id` nas relações centrais); dinheiro em
centavos inteiros; instantes em UTC e fatos "do dia" (check-in de hábito, reflexão, devocional) em
colunas de data, interpretadas no fuso do usuário.

### 3.5 Segurança e privacidade

- **Senhas** com Argon2id. Nunca registradas em log.
- **Sessão**: token de acesso JWT de vida curta (15 min), mantido só em memória no navegador;
  refresh token opaco, rotativo, em cookie `httpOnly` + `Secure` + `SameSite=Strict`, restrito ao
  caminho de autenticação e guardado no banco apenas como hash. Reuso de um refresh já trocado
  revoga a família de sessões. Logout revoga no servidor.
- **Autorização por usuário em toda consulta**: repositories recebem `userId` e filtram por ele.
  Recurso de outro usuário responde `404`, sem revelar existência. Ao relacionar registros (ex.:
  tarefa → objetivo), o service confirma que o destino pertence ao mesmo usuário.
- **Teste obrigatório por módulo**: "usuário B não lê, altera nem apaga recurso do usuário A".
- **Borda**: validação Zod em corpo, parâmetros e query; `helmet`; CORS com lista de origens;
  limite de tentativas nas rotas de autenticação; limite de tamanho de corpo.
- **Erros**: tratador central; resposta padronizada `{ error: { code, message, details? } }`;
  stack trace e mensagens internas nunca saem para o cliente.
- **Dados sensíveis** (finanças, reflexões, orações) não entram em logs.
- **Exportação**: o usuário baixa todos os seus dados em JSON (Fase 6); o modelo já nasce
  exportável porque tudo é alcançável a partir de `userId`.

### 3.6 Convenções da API

- Prefixo `/api/v1`; recursos no plural; JSON; datas em ISO 8601 UTC; dias como `YYYY-MM-DD`.
- Listas paginadas por cursor quando podem crescer sem limite (movimentações, histórico).
- Operações do dia recebem a data do usuário; o servidor resolve o intervalo no fuso dele.
- Em desenvolvimento o Vite faz proxy de `/api` para a API, mantendo mesma origem para os cookies.

### 3.7 Estratégia de testes

| Nível | Ferramenta | O que cobre |
| --- | --- | --- |
| Unitário | Vitest | Regras de negócio puras: recorrência, progresso de objetivo, sequências, saldos e orçamento, insights |
| Integração | Vitest + Supertest + MariaDB de teste | Cada rota: caminho feliz, validação, autenticação e isolamento entre usuários |
| Componente | Vitest + Testing Library | Componentes com comportamento (timeline, captura rápida, formulários) |
| Ponta a ponta | Playwright | Fluxo principal de cada fase, em viewport desktop e mobile |

Uma funcionalidade só é marcada como concluída em `TASKS.md` depois de: testes passando,
`tsc` sem erros, lint limpo e o fluxo principal exercitado no navegador.

## 4. Experiência e interface

A direção visual, os tokens, o inventário de componentes e a especificação da tela "Meu Dia" estão
em [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md), com uma referência visual navegável em
[`docs/design/preview.html`](docs/design/preview.html).

Estrutura de navegação (desktop: sidebar fixa; mobile: barra inferior + menu):

| Grupo | Destinos |
| --- | --- |
| Execução | Meu Dia · Agenda · Tarefas · Projetos |
| Direção | Objetivos (inclui Visão 2027) · Hábitos |
| Desenvolvimento | Estudos · Dev Space · Inglês · Leitura |
| Vida | Saúde · Espiritualidade · Finanças |
| Reflexão | Revisões · Insights |
| Sistema | Notificações · Configurações |

Captura rápida disponível em qualquer tela (atalho de teclado no desktop, botão fixo no mobile).
Módulos podem ser desativados nas configurações e somem da navegação.

## 5. Principais fluxos de uso

1. **Primeiro acesso.** Cadastro → áreas, quadro Kanban e categorias financeiras padrão são
   criados → escolha dos módulos ativos → "Meu Dia" com estados vazios que orientam o primeiro passo.
2. **Manhã — planejar.** Abre "Meu Dia": compromissos, tarefas e hábitos do dia já estão na
   timeline → escolhe até três prioridades → ajusta blocos arrastando → vê tempo planejado contra
   a capacidade do dia.
3. **Durante o dia — executar.** Conclui tarefas e hábitos na própria timeline; inicia um
   cronômetro em uma tarefa ou sessão de estudo (gera `TimeEntry`); captura ideias e despesas sem
   sair da tela.
4. **Noite — fechar.** Reflexão diária em cinco perguntas; o que ficou pendente pode ser
   reagendado em um gesto. O dia fica no histórico.
5. **Objetivo → execução** (exemplo do inglês). Cria o objetivo com data-alvo → marcos → associa
   o hábito "Estudar inglês" → agenda sessões → cada sessão concluída soma tempo e avança a
   métrica → o objetivo mostra progresso, consistência semanal e distância da meta.
6. **Dinheiro → objetivo** (exemplo dos R$ 10.000). Cria a conta-reserva → cria o objetivo
   financeiro ligado a ela → registra aportes (transferências, que não contam como despesa) →
   progresso e projeção de conclusão saem do saldo e do ritmo real de aportes.
7. **Fim de semana — revisar.** A revisão semanal chega preenchida com os números da semana →
   cinco perguntas → três prioridades da próxima semana → resumo salvo no histórico.

## 6. Roadmap

Cada fase termina com: testes executados, TypeScript verificado, interface revisada no navegador
(desktop e mobile, escuro e claro), problemas corrigidos, `TASKS.md` atualizado e decisões
registradas na seção 8. Uma fase não começa com problema crítico aberto na anterior.

| Fase | Entrega | Critério de aceite |
| --- | --- | --- |
| **0 — Planejamento** | Este documento, modelo de dados, design system, `TASKS.md` | Aprovação do dono do produto |
| **1 — Foundation** | Monorepo, lint/format/tsconfig, banco + migrações iniciais, autenticação completa, design system implementado, shell responsivo (sidebar / navegação mobile), temas, estrutura modular, áreas e preferências | Cadastro → login → navegação entre módulos (com estados vazios reais) → logout, em desktop e mobile; isolamento entre usuários testado |
| **2 — Core Productivity** | Meu Dia, Agenda (dia/semana/mês, recorrência, conflitos, arrastar), Tarefas (todas as visualizações), Kanban, Projetos, registro de tempo, Captura Rápida | Um dia inteiro pode ser planejado, executado e encerrado com reflexão usando apenas o RITMO |
| **3 — Personal Development** | Objetivos + Visão 2027, Hábitos, Estudos (com cronômetro), Dev Space, Inglês, Leitura, Saúde, Espiritualidade | Os dois exemplos do briefing funcionam ponta a ponta; cada módulo alimenta `TimeEntry`/objetivos |
| **4 — Financial Management** | Contas e reservas, movimentações, transferências, orçamento mensal, objetivos financeiros com projeção, relatórios | Reservado × disponível corretos; transferência nunca conta como receita/despesa; saldos conferidos por teste |
| **5 — Intelligence** | Revisão semanal e mensal, Insights determinísticos, relatórios de evolução | Cada insight exibido é reproduzível a partir dos dados; nenhum aparece sem dado suficiente |
| **6 — Polish** | PWA instalável, central de notificações e preferências, exportação de dados, acessibilidade, performance, revisão completa de UX, Docker | Instalável em celular e desktop; auditoria de acessibilidade e performance; fluxos ponta a ponta verdes |

As fases 3 e 4 são independentes entre si e podem trocar de ordem se o financeiro for mais urgente.

## 7. Como o desenvolvimento é orquestrado

O trabalho é coordenado com workers do Orca:

- **Coordenador** (esta sessão): define contratos antes de qualquer trabalho paralelo — schema
  Prisma da fase, schemas Zod em `packages/shared`, tokens e componentes base —, distribui as
  tarefas, revisa e integra, e mantém `PROJECT.md` e `TASKS.md`.
- **Workers**: cada um recebe um domínio com fronteira de arquivos explícita (ex.: `modules/habits`
  + `features/habits`), em worktree próprio quando há risco de conflito, e devolve evidência:
  testes, typecheck e o fluxo exercitado.
- **Sequencial onde precisa ser**: a Fase 1 e o início de cada fase (migração + contratos) não são
  paralelizados; módulos independentes dentro da fase, sim.
- Nada é integrado sem revisão do coordenador; nenhuma fase é dada como concluída só pelo relato
  do worker.

## 8. Registro de decisões

| # | Decisão | Motivo |
| --- | --- | --- |
| D1 | Monorepo com npm workspaces e pacote `shared` de schemas Zod | Um contrato só entre API e web; sem ferramenta extra |
| D2 | Regras de negócio apenas na API | Evita duplicação e divergência entre cliente e servidor |
| D3 | `Area` e `TimeEntry` como tabelas transversais | São o que permite a visão integrada da vida e os insights |
| D4 | FKs explícitas em vez de relações polimórficas | Integridade referencial garantida pelo banco |
| D5 | Recorrência por RRULE com exceções materializadas | Não gera milhares de linhas futuras; histórico continua fiel |
| D6 | Dinheiro em centavos inteiros | Sem erro de ponto flutuante em somas e orçamentos |
| D7 | JWT curto em memória + refresh rotativo em cookie `httpOnly` | Token roubado por XSS dura pouco; sessão revogável no servidor |
| D8 | MariaDB nativo no desenvolvimento local | Docker não está instalado nesta máquina; Compose segue entregue |
| D9 | Insights calculados sob demanda, sem tabela de fatos | Sempre refletem os dados atuais; nada é inventado ou defasado |
| D10 | Interface apenas em pt-BR na primeira versão | Foco; textos centralizados para permitir tradução depois |
| D11 | Início da semana na segunda-feira (configurável por usuário) | Revisão semanal de segunda a domingo; já é o padrão do frontend |
| D12 | Compromisso passado sem marcação conta como cumprido, salvo se marcado como perdido ou cancelado | Quase ninguém marca reunião como "feita"; a contagem fica fiel |
| D13 | Excluir coluna ou quadro exige mover as tarefas ou confirmação explícita | O banco não usa `RESTRICT`; a proteção é feita no serviço |
| D14 | Objetivo aceita meta numérica manual ("ler 12 livros") | Custo mínimo: um valor novo de enum, sem tabela nova |
| D15 | Cartão de crédito com parcelas e lançamentos recorrentes ficam fora da primeira versão | Escopo; o briefing pede lançamento manual |
| D16 | Patrimônio informado como um total por data | O briefing pede evolução patrimonial manual, sem itemização |
| D17 | Uma conta-reserva por objetivo (1 para 1) | Evita contar o mesmo dinheiro em dois objetivos |
| D18 | Recuperação de senha e verificação de e-mail entram na Fase 6 | Exigem infraestrutura de envio de e-mail |
| D19 | Reflexão diária tem escala qualitativa de humor (Ótimo → Muito difícil) | Permite acompanhar a evolução ao longo do tempo; já implementada |
| D20 | Capas de livros e materiais apenas por link | Sem upload de arquivos nesta versão |
| D21 | Visual "liquid glass" feito para web (backdrop-filter + indicador deslizante), fundo neutro, cor nos elementos | `expo-glass-effect` é nativo (iOS/React Native) e não roda em React web; o fundo colorido foi rejeitado pelo dono do produto |
| D22 | O botão de adição rápida se chama "Adicionar" (atalho `A`) | "Capturar" foi rejeitado pelo dono do produto |

## 9. Riscos e pendências

| Risco / pendência | Tratamento |
| --- | --- |
| Escopo amplo (15 módulos) | Entrega por fases com critério de aceite; profundidade de cada módulo limitada ao briefing |
| Recorrência + fuso + arrastar na agenda | Regras isoladas em service com testes unitários antes da interface |
| Drag and drop em telas de toque | dnd-kit com sensores de toque; alternativa por menu ("mover para…") sempre disponível |
| Docker não testável localmente | Arquivos entregues e marcados como "não verificado" até haver Docker |
| Credenciais do MariaDB local | Necessárias para criar os bancos `ritmo` e `ritmo_test` no início da Fase 1 |
