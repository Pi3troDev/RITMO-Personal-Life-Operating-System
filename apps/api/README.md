# @ritmo/api

API REST do RITMO. Express 5 + TypeScript, Prisma 7 sobre MariaDB, validação com Zod e documentação
OpenAPI/Swagger gerada dos mesmos contratos.

## Subir em 3 comandos

```bash
npm run setup      # instala, sobe o MariaDB local do projeto (porta 3310), gera o Prisma Client e aplica as migrações
npm run dev:api    # API em http://localhost:3333
npm run dev:web    # front em http://localhost:5173 (em outro terminal), falando com a API real
npm run dev:demo -w @ritmo/web   # opcional: front com dados de exemplo, sem API
```

- **Swagger UI:** <http://localhost:3333/api/docs> · **OpenAPI JSON:** <http://localhost:3333/api/openapi.json>
- Para testar rotas protegidas no Swagger: `POST /auth/register` (ou `/auth/login`), copie o `accessToken`
  da resposta, clique em **Authorize** e cole só o token.
- `npm run db:start | db:stop | db:status` controlam o MariaDB de desenvolvimento (`.data/mariadb`, ignorado pelo
  git). Ele é separado do serviço MariaDB que existir na máquina: usa a porta 3310 e o usuário `ritmo`.
- Para usar outro MariaDB, ajuste `DATABASE_URL` em `apps/api/.env` (modelo em `.env.example`).

## Scripts

| Comando (raiz)                    | O que faz                                                          |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev:api`                 | API com recarga automática                                         |
| `npm test -w @ritmo/api`          | testes unitários e de integração (usam o banco `ritmo_test`)       |
| `npm run typecheck -w @ritmo/api` | `tsc --noEmit` em modo estrito                                     |
| `npm run db:migrate`              | cria e aplica uma migração a partir de mudanças no `schema.prisma` |
| `npm run db:deploy`               | aplica as migrações existentes (produção, CI e o banco de teste)   |
| `npm run openapi`                 | grava `apps/api/openapi.json` sem subir o servidor                 |

> `prisma migrate dev` pede confirmação quando a migração tem avisos (ex.: novo `UNIQUE`) e não roda em terminal
> sem interação. Nesse caso gere o SQL com `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`,
> salve em `prisma/migrations/<timestamp>_<nome>/migration.sql` e rode `npm run db:deploy`.

## Como o código está organizado

```
src/
  app.ts                 monta o Express (sem abrir porta: os testes usam direto)
  server.ts              sobe o processo + agendador de lembretes
  routes.ts              lista todos os módulos, na ordem em que aparecem no Swagger
  config/env.ts          variáveis de ambiente validadas com Zod
  core/
    http/route.ts        `route({...})`: UMA definição gera roteamento, validação e OpenAPI
    http/openapi.ts      monta o documento OpenAPI a partir das rotas
    http/crud.ts         CRUD padrão para recursos simples
    auth/                Argon2id, JWT de acesso, refresh token opaco
    recurrence.ts        RRULE (diária, semanal+BYDAY, mensal, anual; INTERVAL, COUNT, UNTIL)
    time.ts              dia do usuário, fusos, semanas e meses
    time-ledger.ts       mantém o `TimeEntry` dos logs de leitura/treino/oração em sincronia
  modules/<dominio>/     rotas e regras de cada domínio (ver tabela)
prisma/                  schema e migrações
tests/                   integração (Supertest + MariaDB de teste)
```

Cada rota é declarada uma vez com `route({ method, path, tag, summary, params, query, body, response, handler })`.
Os esquemas Zod de entrada e saída vêm de `@ritmo/shared`, o mesmo pacote que o front usa, então o contrato não é
escrito duas vezes. Fora de produção, as respostas também são validadas contra o esquema declarado, o que pega
divergência entre o que a documentação promete e o que a API devolve.

## Módulos (193 operações em 27 grupos no Swagger)

| Grupo                | Principais recursos                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Autenticação / Conta | cadastro, login, refresh rotativo, logout, perfil, preferências, módulos ativos, troca de senha, exclusão |
| Áreas                | áreas da vida (as 9 padrão são criadas no cadastro)                                                       |
| Tarefas / Quadros    | tarefas, checklist, tags, recorrência, visões (hoje, próximas, atrasadas, concluídas), Kanban             |
| Projetos             | projetos com progresso calculado das tarefas                                                              |
| Agenda               | compromissos, séries recorrentes expandidas na leitura, exceções por ocorrência, conflitos                |
| Meu Dia / Captura    | visão do dia, foco (até 3), carga × capacidade, reflexão, reagendar pendências, caixa de entrada          |
| Hábitos              | check-ins, dia excepcional, sequência sem punição, taxa de 30 dias                                        |
| Objetivos            | marcos, métricas (reserva, horas, check-ins), histórico, Visão do ano                                     |
| Finanças             | contas/reservas, categorias, movimentações, transferências, orçamento, visão do mês, projeção             |
| Tempo                | cronômetro (iniciar/pausar/retomar/parar) e lançamento manual                                             |
| Estudos / Dev Space  | trilhas, módulos, aulas, materiais; projetos com roadmap, desafios                                        |
| Inglês / Leitura     | vocabulário e prática por habilidade; biblioteca, sessões de leitura, citações                            |
| Saúde / Espiritual.  | divisões e registros de treino, frequência; devocional, leitura bíblica, orações                          |
| Metas semanais       | uma meta por módulo, com o progresso real da semana                                                       |
| Revisões / Insights  | revisão semanal e mensal já preenchidas; insights determinísticos com evidência                           |
| Relatórios           | distribuição do tempo e evolução semanal                                                                  |
| Notificações / Dados | central, preferências, base de web push, lembretes automáticos; exportação em JSON                        |

## Regras que valem para toda a API

- **Isolamento por usuário.** Toda consulta filtra por `userId`. Recurso de outro usuário responde `404` (nunca
  `403`), e vínculos cruzados (uma tarefa apontando para o objetivo de outra pessoa) são recusados com `400`. Há um
  teste por rota para isso (`tests/isolation.test.ts`).
- **Sessão.** Token de acesso JWT de 15 min (enviado em `Authorization: Bearer`) + refresh token opaco, rotativo, em
  cookie `httpOnly` + `SameSite=Strict`, restrito a `/api/v1/auth` e guardado no banco só como hash SHA-256. Reapresentar
  um refresh já trocado (fora de uma janela de 10 s para corrida entre abas) revoga toda a sessão.
- **Erros.** Sempre `{ "error": { "code", "message", "details?" } }`. Erros internos nunca vazam detalhes.
- **Dinheiro** em centavos inteiros. **Instantes** em ISO 8601 UTC. **Dias** como `YYYY-MM-DD` no fuso do usuário.
- **Dados reais ou nada.** Progresso de objetivo, sequências, saldos, orçamentos, métricas de revisão e insights são
  calculados no servidor a partir do que foi registrado.
