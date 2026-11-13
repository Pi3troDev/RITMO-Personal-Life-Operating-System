# RITMO — Personal Life Operating System

Atue como um time multidisciplinar composto por:

- Senior Product Designer especializado em produtos digitais premium.
- Senior Full Stack Software Engineer.
- Software Architect.
- UX/UI Designer especializado em interfaces modernas.
- Especialista em produtividade, gestão de objetivos e sistemas de hábitos.
- Product Manager responsável por transformar uma visão de produto em um software funcional.

Sua missão é projetar e desenvolver um aplicativo chamado **RITMO**, um Personal Life Operating System (Life OS).

Não quero um CRUD genérico, um clone do Notion, uma cópia do Todoist ou apenas um dashboard com gráficos.

Quero construir um produto de produtividade pessoal completo, inteligente, integrado, visualmente excepcional e realmente útil no cotidiano.

O propósito do RITMO é ajudar uma pessoa a organizar sua vida, desenvolver disciplina, cumprir compromissos, administrar recursos, desenvolver habilidades e alcançar objetivos de longo prazo.

A pergunta que o aplicativo deve ajudar a responder todos os dias é:

**"Estou vivendo de acordo com aquilo que quero construir para o meu futuro?"**

---

# 1. VISÃO DO PRODUTO

O RITMO deve centralizar diferentes dimensões da vida em um único ambiente.

O usuário deve conseguir organizar:

1. Rotina e agenda.
2. Tarefas e produtividade.
3. Projetos e Kanban.
4. Objetivos pessoais.
5. Hábitos e disciplina.
6. Finanças pessoais.
7. Estudos e desenvolvimento intelectual.
8. Programação e carreira.
9. Idiomas, especialmente inglês.
10. Saúde e academia.
11. Espiritualidade e devocional.
12. Leitura e conhecimento.
13. Trabalho e compromissos profissionais.
14. Planejamento semanal, mensal e anual.
15. Reflexões e acompanhamento de evolução.

Esses módulos não devem funcionar isoladamente.

O grande diferencial do RITMO será a integração entre eles.

Exemplo:

O usuário cria um objetivo: "Conseguir conversar em inglês com confiança até dezembro de 2027".

O sistema permite:
- Definir uma data-alvo.
- Criar marcos intermediários.
- Associar hábitos ao objetivo.
- Criar sessões de estudo na agenda.
- Registrar o tempo dedicado.
- Acompanhar o progresso.
- Analisar a consistência semanal.
- Visualizar o quanto está próximo da meta.

Outro exemplo:

O usuário cria um objetivo financeiro para economizar R$ 10.000.

Esse objetivo pode estar conectado ao módulo financeiro, com:
- Valor atual reservado.
- Valor desejado.
- Prazo.
- Aportes planejados.
- Histórico de movimentações.
- Projeção de conclusão.
- Progresso visual.

Tudo deve estar conectado.

---

# 2. IDENTIDADE VISUAL E EXPERIÊNCIA

A interface é extremamente importante.

Quero um produto com aparência de SaaS premium, moderno, minimalista, sofisticado e muito bem acabado.

Referências conceituais:
- Linear: organização, navegação e produtividade.
- Notion: flexibilidade e organização.
- Things 3: simplicidade e clareza.
- Raycast: experiência premium.
- Apple: atenção aos detalhes e hierarquia visual.
- Sunsama: planejamento diário.

Não copie essas interfaces. Utilize apenas como referências de qualidade.

## Diretrizes visuais

- Design minimalista.
- Dark mode como tema principal.
- Light mode disponível.
- Excelente tipografia.
- Espaçamentos consistentes.
- Hierarquia visual muito clara.
- Ícones Lucide.
- Animações sutis e funcionais.
- Transições suaves.
- Gráficos elegantes.
- Componentes reutilizáveis.
- Estados vazios bem desenhados.
- Feedback visual para todas as ações.
- Responsividade real.

Não quero:
- Gradientes exagerados.
- Cores aleatórias.
- Cards desnecessários.
- Interfaces poluídas.
- Muitos elementos competindo por atenção.
- Aparência de template genérico de dashboard.
- Botões decorativos sem funcionalidade.

O design deve transmitir clareza, controle, tranquilidade e evolução.

## Layout principal

Desktop:
- Sidebar fixa e organizada.
- Área principal ampla.
- Cabeçalho com data, saudação e ações rápidas.
- Conteúdo contextual de acordo com o módulo.
- Navegação rápida entre áreas.

Mobile:
- Experiência própria para telas pequenas.
- Navegação inferior ou menu adaptativo.
- Acesso rápido à rotina diária.
- Criação rápida de tarefas.
- Excelente usabilidade por toque.

O aplicativo deverá ser desenvolvido como PWA, permitindo instalação no celular e no desktop.

---

# 3. DASHBOARD — MEU DIA

Esta será a tela mais importante do aplicativo.

Ao abrir o RITMO, o usuário deve entender imediatamente o estado da sua vida naquele dia.

Não quero apenas uma lista de tarefas.

Quero um painel de execução diária.

Elementos:

## Cabeçalho
- Bom dia / Boa tarde / Boa noite.
- Data atual.
- Frase curta contextual ou reflexão.
- Indicador de progresso diário.
- Botão de captura rápida.

## Resumo diário
- Compromissos do dia.
- Tarefas pendentes.
- Tarefas concluídas.
- Hábitos programados.
- Objetivos em andamento.
- Tempo planejado.
- Tempo efetivamente dedicado às atividades.

## Timeline diária

Uma linha do tempo visual mostrando:
- Horário.
- Atividade.
- Categoria.
- Duração.
- Status.
- Prioridade.

Permitir visualizar o dia inteiro e reorganizar atividades.

## Foco do dia

O usuário pode escolher até três prioridades principais.

Essas prioridades devem ganhar destaque na interface.

## Progresso diário

Criar um indicador de execução baseado em atividades planejadas e concluídas.

Não transformar esse número em uma avaliação absoluta do valor ou da disciplina do usuário.

Dias difíceis devem continuar sendo dias válidos.

## Reflexão diária

Ao finalizar o dia, permitir registrar:

- O que consegui fazer?
- O que ficou pendente?
- O que aprendi?
- O que posso melhorar amanhã?
- Como foi meu dia?

Criar histórico dessas reflexões.

---

# 4. AGENDA E CALENDÁRIO

Criar um módulo completo de organização temporal.

Funcionalidades:

- Visualização diária.
- Visualização semanal.
- Visualização mensal.
- Criar compromissos.
- Criar tarefas com horário.
- Atividades recorrentes.
- Categorias personalizadas.
- Definição de duração.
- Lembretes.
- Identificação de conflitos de horários.
- Arrastar e soltar atividades.
- Navegação entre datas.

Categorias iniciais:
- Trabalho.
- Estudos.
- Programação.
- Inglês.
- Academia.
- Espiritualidade.
- Leitura.
- Pessoal.
- Outros.

Uma tarefa pode estar associada a um projeto, objetivo ou hábito.

Diferenciar compromisso com horário marcado de tarefa flexível.

---

# 5. TASK MANAGER E KANBAN

Criar um gerenciador de tarefas robusto.

Cada tarefa deve possuir:

- Título.
- Descrição.
- Data de criação.
- Prazo.
- Prioridade.
- Categoria.
- Status.
- Estimativa de duração.
- Tempo realizado.
- Tags.
- Projeto relacionado.
- Objetivo relacionado.
- Recorrência.
- Checklist interno.
- Observações.

Visualizações:

1. Lista.
2. Kanban.
3. Calendário.
4. Minhas tarefas de hoje.
5. Próximas tarefas.
6. Tarefas atrasadas.
7. Concluídas.

Kanban padrão:

- Backlog.
- A fazer.
- Em andamento.
- Em revisão.
- Concluído.

Permitir criar quadros personalizados e colunas.

Implementar drag and drop.

Criar sistema de captura rápida para adicionar tarefas sem precisar preencher vários campos.

---

# 6. OBJETIVOS E METAS

Este módulo será um dos diferenciais do RITMO.

Quero um sistema de objetivos que transforme sonhos em planos executáveis.

Permitir criar objetivos em diferentes dimensões:

- Financeiro.
- Profissional.
- Acadêmico.
- Intelectual.
- Saúde.
- Espiritual.
- Pessoal.
- Relacionamentos.

Cada objetivo deverá possuir:

- Nome.
- Descrição.
- Categoria.
- Data de início.
- Data-alvo.
- Progresso.
- Status.
- Marcos intermediários.
- Tarefas relacionadas.
- Hábitos relacionados.
- Histórico de evolução.

Exemplo:

Objetivo: Desenvolver inglês até nível intermediário.

Marcos:
- Concluir determinado conteúdo.
- Aprender vocabulário.
- Praticar conversação.
- Melhorar compreensão auditiva.

O sistema deverá permitir acompanhar cada marco separadamente.

Criar visualizações de:
- Objetivos ativos.
- Objetivos concluídos.
- Objetivos pausados.
- Objetivos por categoria.
- Evolução ao longo do tempo.

Também criar uma área chamada "Visão 2027", onde o usuário registra os principais resultados que deseja alcançar durante o ano.

---

# 7. HABITS — CONSTRUÇÃO DE DISCIPLINA

Criar um habit tracker completo.

O usuário poderá cadastrar hábitos como:

- Estudar inglês.
- Programar.
- Ler.
- Ir à academia.
- Fazer devocional.
- Organizar o ambiente.
- Planejar o próximo dia.
- Dormir em horário planejado.

Cada hábito deverá permitir:

- Nome.
- Categoria.
- Frequência.
- Dias da semana.
- Horário sugerido.
- Meta de duração ou quantidade.
- Histórico.
- Observações.
- Objetivo relacionado.

Exibir:
- Calendário de consistência.
- Histórico semanal.
- Histórico mensal.
- Taxa de cumprimento.
- Tendências.
- Evolução individual.

Criar sequências de consistência (streaks), mas não punir o usuário por perder uma sequência.

Permitir pausar hábitos e registrar dias excepcionais.

Não usar gamificação infantil.

O foco é consistência sustentável, não obsessão por números.

---

# 8. FINANCEIRO — PERSONAL FINANCE

Criar um módulo de controle financeiro pessoal.

O objetivo é permitir que o usuário compreenda sua situação financeira e consiga planejar o futuro.

## Dashboard financeiro

Exibir:
- Saldo inicial.
- Total de receitas.
- Total de despesas.
- Dinheiro reservado.
- Valor disponível.
- Evolução mensal.
- Despesas por categoria.
- Comparativo entre meses.

## Movimentações

Permitir registrar:

- Receitas.
- Despesas.
- Transferências entre contas.
- Aportes em reservas.
- Resgates.

Cada movimentação deve possuir:

- Descrição.
- Valor.
- Data.
- Categoria.
- Conta.
- Tipo.
- Observação.

## Contas e reservas

Permitir criar contas personalizadas.

Exemplos:
- Conta principal.
- Reserva de emergência.
- Viagem.
- Notebook.
- Faculdade.
- Investimentos.

Importante: separar dinheiro reservado de dinheiro disponível para gastos.

Transferências entre contas próprias não devem ser contabilizadas como receita ou despesa.

## Planejamento financeiro

Permitir criar objetivos financeiros:

- Viagem internacional.
- Comprar um computador.
- Reserva de emergência.
- Faculdade.
- Compra de um veículo.

Cada objetivo deverá possuir:
- Valor desejado.
- Valor acumulado.
- Prazo.
- Aportes planejados.
- Projeção de conclusão.
- Histórico de aportes.

## Orçamento mensal

Criar limites por categoria.

Exibir comparações entre:
- Planejado.
- Realizado.
- Disponível.

## Relatórios

- Fluxo de caixa.
- Evolução patrimonial informada manualmente.
- Receitas e despesas.
- Evolução das reservas.
- Comparativo mensal.

Não integrar contas bancárias nesta primeira versão.

Todos os dados devem ser informados manualmente pelo usuário.

---

# 9. STUDY CENTER — ESTUDOS E DESENVOLVIMENTO

Criar um espaço dedicado ao desenvolvimento intelectual.

O usuário deve poder criar diferentes trilhas de aprendizagem.

Exemplos:

- Engenharia de Software.
- Desenvolvimento Full Stack.
- Inglês.
- Matemática.
- Física.
- Inteligência Artificial.

Cada trilha deverá possuir:

- Objetivo.
- Conteúdos.
- Módulos.
- Aulas.
- Materiais.
- Links externos.
- Status.
- Progresso.
- Tempo estudado.
- Anotações.

Criar uma funcionalidade de sessão de estudos.

Durante uma sessão:
- Selecionar uma trilha.
- Selecionar um conteúdo.
- Iniciar cronômetro.
- Pausar.
- Finalizar.
- Registrar observações.

Salvar o histórico de sessões.

Criar relatórios de tempo dedicado por matéria e por semana.

Permitir criar metas de estudo semanais.

---

# 10. DEV SPACE — PROGRAMAÇÃO E CARREIRA

Um espaço específico para acompanhar a evolução profissional e técnica.

Funcionalidades:

- Projetos de desenvolvimento.
- Tecnologias estudadas.
- Roadmaps.
- Cursos.
- Documentações.
- Desafios técnicos.
- Ideias de projetos.
- Portfólio.
- Metas profissionais.

Cada projeto poderá possuir:

- Nome.
- Descrição.
- Stack.
- Status.
- Repositório GitHub.
- Link de produção.
- Tarefas.
- Prazo.
- Histórico de atualizações.

Criar um roadmap visual de aprendizado.

Exemplo:

Backend:
- Node.js.
- TypeScript.
- APIs REST.
- Prisma.
- SQL.
- Docker.

Frontend:
- React.
- TypeScript.
- Componentização.
- Gerenciamento de estado.

O usuário deve conseguir marcar conteúdos como não iniciado, estudando e concluído.

---

# 11. ENGLISH CENTER

Criar um módulo de acompanhamento do inglês.

Funcionalidades:

- Vocabulário.
- Palavras novas.
- Frases.
- Anotações.
- Conteúdos estudados.
- Metas semanais.
- Histórico de prática.
- Sessões de listening.
- Sessões de reading.
- Sessões de speaking.
- Sessões de writing.

Permitir registrar novas palavras com tradução, significado e exemplo próprio.

Criar revisão de vocabulário baseada em repetição espaçada como evolução futura.

Não é necessário desenvolver inteligência artificial de ensino nesta primeira versão.

---

# 12. HEALTH & FITNESS

Criar um módulo para acompanhar a rotina de saúde e atividade física.

Funcionalidades:

- Registro de treinos.
- Divisão de treinos.
- Exercícios.
- Histórico.
- Frequência semanal.
- Registro de caminhadas.
- Metas pessoais de atividade.
- Acompanhamento de consistência.

Permitir cadastrar treinos personalizados.

Exemplo:
- Treino A.
- Treino B.
- Treino C.

Registrar data e exercícios realizados.

O módulo deve ser voltado à organização e ao acompanhamento saudável, sem avaliações estéticas ou comparações corporais.

---

# 13. SPIRITUAL LIFE

Criar um espaço reservado para espiritualidade.

O objetivo é ajudar o usuário a manter consistência em sua vida espiritual.

Funcionalidades:

- Devocional diário.
- Registro de leituras bíblicas.
- Versículo ou referência do dia.
- Reflexões pessoais.
- Pedidos de oração.
- Registro de orações.
- Histórico de devocionais.
- Metas de leitura bíblica.

Criar uma interface simples, tranquila e sem excesso de elementos.

Permitir registrar:
- Texto bíblico lido.
- O que aprendeu.
- Reflexão.
- Aplicação prática.

Não transformar espiritualidade em competição ou pontuação.

---

# 14. READING — BIBLIOTECA PESSOAL

Criar uma biblioteca pessoal.

Permitir cadastrar livros com:

- Título.
- Autor.
- Categoria.
- Capa.
- Status.
- Data de início.
- Data de conclusão.
- Progresso.
- Avaliação pessoal.
- Anotações.

Status:
- Quero ler.
- Lendo.
- Concluído.
- Pausado.

Permitir registrar páginas lidas e citações curtas com observações pessoais.

Criar histórico de leitura.

---

# 15. WEEKLY REVIEW — REVISÃO SEMANAL

Quero uma funcionalidade realmente importante.

No final de cada semana, o sistema deve apresentar uma revisão da vida do usuário.

Exibir:

- Tarefas concluídas.
- Tarefas pendentes.
- Hábitos realizados.
- Tempo estudado.
- Sessões de programação.
- Frequência de academia.
- Evolução financeira.
- Objetivos que avançaram.
- Objetivos sem movimentação.
- Compromissos cumpridos.

Depois, apresentar perguntas:

1. Qual foi minha maior conquista?
2. O que não saiu como planejado?
3. Onde investi melhor meu tempo?
4. O que precisa de atenção?
5. Quais são minhas três prioridades para a próxima semana?

Permitir gerar um resumo semanal e salvar no histórico.

Criar também uma revisão mensal.

---

# 16. SMART INSIGHTS — INTELIGÊNCIA DO SISTEMA

Este é um dos recursos que podem tornar o RITMO diferente de outros aplicativos.

O sistema deve analisar os próprios dados registrados e produzir informações úteis.

Exemplos:

- Você planejou 12 sessões de estudo neste mês e concluiu 9.
- Seu maior volume de atividades está concentrado nas terças-feiras.
- Você tem três objetivos sem atualizações recentes.
- Seus gastos com determinada categoria aumentaram em relação ao mês anterior.
- Você está dedicando mais tempo à programação do que no mês passado.

Criar uma área chamada "Insights".

As análises devem ser baseadas em dados reais do usuário.

Não inventar informações, diagnósticos ou conclusões.

Uma integração com LLM poderá ser adicionada futuramente, mas a primeira versão deverá funcionar com regras e cálculos determinísticos.

---

# 17. QUICK CAPTURE — CAPTURA RÁPIDA

Criar um mecanismo acessível de qualquer tela.

O usuário deve conseguir registrar rapidamente:

- Uma tarefa.
- Uma ideia.
- Um compromisso.
- Uma despesa.
- Uma anotação.
- Um objetivo.

A captura deve exigir o mínimo de interação possível.

Permitir classificar o item posteriormente.

---

# 18. NOTIFICAÇÕES E LEMBRETES

Criar uma central de notificações.

Permitir:
- Lembretes de compromissos.
- Lembretes de tarefas.
- Lembretes de hábitos.
- Alertas de prazos.
- Revisão semanal.
- Objetivos próximos da data-alvo.

O usuário deverá controlar quais notificações deseja receber.

Preparar arquitetura para notificações web push como evolução.

---

# 19. ARQUITETURA E TECNOLOGIAS

Quero uma aplicação Full Stack real, com código organizado e escalável.

Stack sugerida:

Frontend:
- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui.
- Lucide React.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Biblioteca de gráficos adequada.
- Biblioteca de drag and drop.

Backend:
- Node.js.
- Express.
- TypeScript.
- Prisma ORM.
- MySQL ou MariaDB.
- Zod para validação.
- JWT ou estratégia de sessão segura.

Infraestrutura:
- Docker.
- Docker Compose.
- Variáveis de ambiente.
- ESLint.
- Prettier.
- Testes automatizados.

Arquitetura:
- Separação entre frontend e backend.
- Organização modular por domínio.
- Controllers.
- Services.
- Repositories quando justificável.
- Middlewares.
- Validação de dados.
- Tratamento centralizado de erros.
- Tipagem consistente.

Não misturar regras de negócio dentro dos componentes React.

O banco deverá possuir relacionamentos bem planejados e integridade referencial.

Projetar desde o início para múltiplos usuários, mesmo que inicialmente seja um aplicativo de uso pessoal.

---

# 20. SEGURANÇA E DADOS

Implementar:

- Cadastro e autenticação.
- Login.
- Logout.
- Proteção de rotas.
- Senhas com hash seguro.
- Validação no backend.
- Autorização por usuário.
- Isolamento dos dados pessoais.
- Proteção contra acesso indevido a recursos de outros usuários.
- Tratamento seguro de erros.

Os dados financeiros, pessoais e reflexões devem ser privados.

Preparar funcionalidades de exportação e backup.

---

# 21. EXPERIÊNCIA DE USO E DIFERENCIAIS

Quero que o RITMO tenha algumas características próprias:

**1. Contexto integrado**

Uma tarefa pode pertencer a um projeto, contribuir para um objetivo e estar programada na agenda.

**2. Visão da vida**

O usuário consegue entender como está distribuindo seu tempo e atenção entre as áreas.

**3. Planejamento realista**

Não permitir que a experiência incentive o usuário a lotar a agenda com mais atividades do que consegue executar.

**4. Histórico de evolução**

O aplicativo precisa guardar registros suficientes para mostrar a evolução ao longo dos meses e anos.

**5. Flexibilidade**

O usuário pode ativar, desativar e personalizar módulos.

**6. Sem gamificação excessiva**

Não quero moedas, mascotes, rankings ou recompensas artificiais.

O sentimento de progresso deve vir da própria evolução do usuário.

---

# 22. REGRAS IMPORTANTES DE DESENVOLVIMENTO

Estas regras são obrigatórias:

1. Não desenvolver tudo de uma vez.
2. Não criar telas apenas ilustrativas.
3. Não utilizar dados mockados como se fossem dados reais.
4. Não deixar botões sem funcionalidade.
5. Não duplicar regras de negócio.
6. Não criar componentes gigantescos.
7. Não ignorar responsividade.
8. Não comprometer a arquitetura para entregar rapidamente uma interface.
9. Não instalar bibliotecas desnecessárias.
10. Não implementar funcionalidades futuras sem necessidade.
11. Não ignorar estados de loading, erro, sucesso e vazio.
12. Não deixar erros de TypeScript sem justificativa.
13. Não considerar uma funcionalidade concluída sem testar seu fluxo principal.

Priorize código legível, tipado, modular e sustentável.

---

# 23. METODOLOGIA DE EXECUÇÃO

Antes de começar a desenvolver:

1. Analise o repositório existente.
2. Identifique tecnologias, arquivos e estrutura atual.
3. Não sobrescreva código existente sem compreender sua finalidade.
4. Apresente a arquitetura proposta.
5. Defina a estrutura de pastas.
6. Planeje o banco de dados.
7. Apresente os principais fluxos de utilização.
8. Defina um roadmap de implementação.

Crie um arquivo PROJECT.md documentando a visão, arquitetura, decisões e roadmap.

Crie também um arquivo TASKS.md para acompanhar o desenvolvimento.

## Fases de desenvolvimento

FASE 1 — FOUNDATION

- Configuração do projeto.
- Design system.
- Layout principal.
- Sidebar.
- Responsividade.
- Banco de dados.
- Autenticação.
- Estrutura modular.

FASE 2 — CORE PRODUCTIVITY

- Dashboard.
- Agenda.
- Tarefas.
- Kanban.
- Quick Capture.

FASE 3 — PERSONAL DEVELOPMENT

- Objetivos.
- Hábitos.
- Estudos.
- Dev Space.
- English Center.
- Reading.
- Health & Fitness.
- Spiritual Life.

FASE 4 — FINANCIAL MANAGEMENT

- Contas.
- Movimentações.
- Reservas.
- Orçamentos.
- Objetivos financeiros.
- Relatórios.

FASE 5 — INTELLIGENCE

- Weekly Review.
- Monthly Review.
- Smart Insights.
- Análises integradas.
- Relatórios de evolução.

FASE 6 — POLISH

- PWA.
- Notificações.
- Otimizações.
- Testes.
- Acessibilidade.
- Performance.
- Revisão completa de UX.

Ao finalizar cada fase:
- Execute testes.
- Verifique o TypeScript.
- Revise a interface.
- Corrija problemas.
- Atualize TASKS.md.
- Documente decisões importantes.

Não avance ignorando problemas críticos das fases anteriores.

---

# 24. RESULTADO ESPERADO

O RITMO deverá se tornar o lugar onde o usuário começa o dia para entender suas prioridades e termina o dia para avaliar sua execução.

Não quero apenas organizar tarefas.

Quero conectar tempo, dinheiro, conhecimento, projetos, hábitos e objetivos em um único sistema.

Quero uma experiência que faça o usuário pensar:

"Agora eu tenho clareza sobre o que preciso fazer e consigo enxergar se estou avançando."

Comece analisando o projeto atual e proponha a arquitetura e o plano de execução.

**IMPORTANTE: não implemente todas as fases imediatamente. Primeiro apresente sua análise, arquitetura, estrutura do banco de dados, estrutura de pastas e roadmap detalhado. Aguarde minha aprovação antes de iniciar a implementação.**

Pense como se estivesse construindo um produto SaaS premium que será utilizado diariamente por milhares de pessoas.

Qualidade de engenharia, experiência de usuário e consistência são prioridades.
