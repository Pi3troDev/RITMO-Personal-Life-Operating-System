/**
 * In-memory demo database. It exists only so the interface can be reviewed before the real API
 * exists; every response goes through the same Zod contracts the API will use.
 * Nothing here ships to production: `main.tsx` starts it only in demo mode.
 */
import {
  DEFAULT_AREAS,
  type Account,
  type Area,
  type Board,
  type CalendarEvent,
  type FinanceCategory,
  type Goal,
  type HabitCheckin,
  type InboxItem,
  type Reflection,
  type Task,
  type Transaction,
  type User,
} from '@ritmo/shared';
import { addDays, format, subDays, subMonths } from 'date-fns';

const iso = (d: Date) => d.toISOString();
const key = (d: Date) => format(d, 'yyyy-MM-dd');

function at(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Small deterministic generator so the demo looks the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface HabitRecord {
  id: string;
  name: string;
  areaId: string | null;
  goalId: string | null;
  weekdays: number[];
  suggestedTime: string | null;
  targetType: 'check' | 'duration' | 'quantity';
  targetValue: number | null;
  targetUnit: string | null;
  notes: string | null;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  areaId: string | null;
  goalId: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  dueDate: string | null;
  createdAt: string;
}

export interface DemoDb {
  projects: ProjectRecord[];
  user: User;
  areas: Area[];
  board: Board;
  tasks: Task[];
  events: CalendarEvent[];
  habits: HabitRecord[];
  checkins: HabitCheckin[];
  goals: Goal[];
  accounts: Account[];
  categories: FinanceCategory[];
  transactions: Transaction[];
  budgets: { categoryId: string; month: string; limitCents: number }[];
  inbox: InboxItem[];
  focus: Record<string, string[]>;
  reflections: Record<string, Reflection>;
  timeEntries: { date: string; areaId: string | null; minutes: number }[];
}

export function createDemoDb(): DemoDb {
  const now = new Date();
  const today = new Date(now);
  const rand = rng(2026);

  const areas: Area[] = DEFAULT_AREAS.map((a, i) => ({
    id: `area-${a.color}`,
    ...a,
    position: i,
    archived: false,
  }));
  const area = (color: string) => `area-${color}`;

  const user: User = {
    id: 'user-demo',
    name: 'Pietro',
    email: 'demo@ritmo.app',
    timezone: 'America/Sao_Paulo',
    weekStartsOn: 1,
    dailyCapacityMinutes: 6 * 60,
    createdAt: iso(subMonths(now, 3)),
  };

  const columnDefs = [
    ['col-backlog', 'Backlog', 'backlog'],
    ['col-todo', 'A fazer', 'todo'],
    ['col-doing', 'Em andamento', 'in_progress'],
    ['col-review', 'Em revisão', 'in_review'],
    ['col-done', 'Concluído', 'done'],
  ] as const;
  const board: Board = {
    id: 'board-default',
    name: 'Meu quadro',
    isDefault: true,
    columns: columnDefs.map(([id, name, statusCategory], position) => ({
      id,
      boardId: 'board-default',
      name,
      statusCategory,
      position,
    })),
  };

  let pos = 0;
  const task = (
    t: Partial<Task> & Pick<Task, 'title' | 'columnId' | 'status'>,
  ): Task => ({
    id: `task-${++pos}`,
    description: null,
    priority: 'none',
    areaId: null,
    projectId: null,
    goalId: null,
    boardId: 'board-default',
    position: pos,
    dueDate: null,
    scheduledStart: null,
    estimateMinutes: null,
    spentMinutes: 0,
    tags: [],
    checklist: [],
    recurrence: null,
    notes: null,
    completedAt: null,
    createdAt: iso(subDays(now, 5)),
    updatedAt: iso(subDays(now, 1)),
    ...t,
  });

  const tasks: Task[] = [
    task({
      title: 'Revisar pull request da API de pagamentos',
      columnId: 'col-doing',
      status: 'in_progress',
      priority: 'high',
      areaId: area('trabalho'),
      dueDate: key(today),
      scheduledStart: iso(at(today, 9, 30)),
      estimateMinutes: 45,
      tags: ['code-review'],
    }),
    task({
      title: 'Estudar inglês: lição de listening (B1)',
      columnId: 'col-todo',
      status: 'todo',
      priority: 'high',
      areaId: area('ingles'),
      goalId: 'goal-english',
      dueDate: key(today),
      scheduledStart: iso(at(today, 12, 30)),
      estimateMinutes: 40,
    }),
    task({
      title: 'Implementar autenticação do projeto pessoal',
      columnId: 'col-todo',
      status: 'todo',
      priority: 'medium',
      areaId: area('programacao'),
      goalId: 'goal-portfolio',
      dueDate: key(today),
      scheduledStart: iso(at(today, 19, 30)),
      estimateMinutes: 90,
      checklist: [
        { id: 'c1', title: 'Modelar tabela de usuários', done: true },
        { id: 'c2', title: 'Hash de senha', done: true },
        { id: 'c3', title: 'Rotas de login e logout', done: false },
        { id: 'c4', title: 'Testes de integração', done: false },
      ],
      tags: ['backend'],
    }),
    task({
      title: 'Pagar a fatura do cartão',
      columnId: 'col-todo',
      status: 'todo',
      priority: 'urgent',
      areaId: area('pessoal'),
      dueDate: key(subDays(today, 1)),
      estimateMinutes: 10,
    }),
    task({
      title: 'Planejar a semana',
      columnId: 'col-todo',
      status: 'todo',
      priority: 'medium',
      areaId: area('pessoal'),
      dueDate: key(addDays(today, 1)),
      estimateMinutes: 25,
    }),
    task({
      title: 'Enviar relatório mensal ao time',
      columnId: 'col-review',
      status: 'in_review',
      priority: 'medium',
      areaId: area('trabalho'),
      dueDate: key(addDays(today, 2)),
      estimateMinutes: 30,
    }),
    task({
      title: 'Pesquisar notebook para estudos',
      columnId: 'col-backlog',
      status: 'backlog',
      areaId: area('pessoal'),
      tags: ['compras'],
    }),
    task({
      title: 'Montar roadmap de TypeScript avançado',
      columnId: 'col-backlog',
      status: 'backlog',
      areaId: area('programacao'),
    }),
    task({
      title: 'Ler 20 páginas de “Hábitos Atômicos”',
      columnId: 'col-done',
      status: 'done',
      areaId: area('leitura'),
      dueDate: key(today),
      estimateMinutes: 30,
      spentMinutes: 35,
      completedAt: iso(at(today, 7, 40)),
    }),
    task({
      title: 'Treino A — peito e tríceps',
      columnId: 'col-done',
      status: 'done',
      areaId: area('academia'),
      dueDate: key(today),
      estimateMinutes: 60,
      spentMinutes: 62,
      completedAt: iso(at(today, 6, 50)),
    }),
  ];

  // Extra tasks that give the projects some substance.
  tasks.push(
    task({ title: 'Criar o layout responsivo', columnId: 'col-backlog', status: 'backlog', areaId: area('programacao'), projectId: 'proj-portfolio', estimateMinutes: 180 }),
    task({ title: 'Configurar o deploy', columnId: 'col-backlog', status: 'backlog', areaId: area('programacao'), projectId: 'proj-portfolio', estimateMinutes: 90 }),
    task({ title: 'Escrever o README do projeto', columnId: 'col-todo', status: 'todo', priority: 'low', areaId: area('programacao'), projectId: 'proj-portfolio', dueDate: key(addDays(today, 9)), estimateMinutes: 45 }),
    task({ title: 'Contratar o frete da mudança', columnId: 'col-todo', status: 'todo', priority: 'high', areaId: area('pessoal'), projectId: 'proj-house', dueDate: key(addDays(today, 3)), estimateMinutes: 30 }),
    task({ title: 'Encaixotar a cozinha', columnId: 'col-todo', status: 'todo', areaId: area('pessoal'), projectId: 'proj-house', dueDate: key(addDays(today, 5)), estimateMinutes: 90 }),
    task({ title: 'Atualizar o endereço nos bancos', columnId: 'col-backlog', status: 'backlog', areaId: area('pessoal'), projectId: 'proj-house' }),
    task({ title: 'Finalizar o site do cliente', columnId: 'col-done', status: 'done', areaId: area('trabalho'), projectId: 'proj-site', completedAt: iso(subDays(now, 20)) }),
    task({ title: 'Entregar a documentação ao cliente', columnId: 'col-done', status: 'done', areaId: area('trabalho'), projectId: 'proj-site', completedAt: iso(subDays(now, 18)) }),
  );
  const projectOfTask: Record<string, string> = {
    'task-2': 'proj-english',
    'task-3': 'proj-portfolio',
    'task-8': 'proj-portfolio',
  };
  for (const t of tasks) {
    const projectId = projectOfTask[t.id];
    if (projectId) t.projectId = projectId;
  }

  const projects: ProjectRecord[] = [
    { id: 'proj-portfolio', name: 'Portfólio full stack', description: 'Primeiro projeto completo para o portfólio: API, interface e deploy.', areaId: area('programacao'), goalId: 'goal-portfolio', status: 'active', dueDate: '2027-02-28', createdAt: iso(subMonths(now, 2)) },
    { id: 'proj-english', name: 'Plano de estudos de inglês (B1 → B2)', description: 'Aulas semanais, listening diário e conversação em grupo.', areaId: area('ingles'), goalId: 'goal-english', status: 'active', dueDate: '2027-06-30', createdAt: iso(subMonths(now, 3)) },
    { id: 'proj-house', name: 'Organizar a mudança', description: null, areaId: area('pessoal'), goalId: null, status: 'active', dueDate: key(addDays(today, 38)), createdAt: iso(subDays(now, 12)) },
    { id: 'proj-site', name: 'Site do cliente (freela)', description: 'Entregue e documentado.', areaId: area('trabalho'), goalId: null, status: 'completed', dueDate: null, createdAt: iso(subMonths(now, 2)) },
  ];

  const ev = (
    id: string,
    title: string,
    areaColor: string,
    dayOffset: number,
    h: number,
    m: number,
    minutes: number,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => ({
    id,
    title,
    description: null,
    areaId: area(areaColor),
    goalId: null,
    start: iso(at(addDays(today, dayOffset), h, m)),
    end: iso(at(addDays(today, dayOffset), h, m + minutes)),
    allDay: false,
    location: null,
    recurrence: null,
    reminderMinutes: 15,
    status: 'scheduled',
    createdAt: iso(subDays(now, 10)),
    ...extra,
  });
  const events: CalendarEvent[] = [
    ev('ev-1', 'Daily do time', 'trabalho', -30, 9, 0, 15, { recurrence: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }),
    ev('ev-2', 'Reunião de planejamento do sprint', 'trabalho', 0, 14, 0, 60),
    ev('ev-2b', 'Call de alinhamento com cliente', 'trabalho', 0, 14, 30, 30),
    ev('ev-3', 'Aula de matemática (cálculo)', 'estudos', -30, 20, 45, 75, { recurrence: 'FREQ=WEEKLY;BYDAY=TU,TH' }),
    ev('ev-4', 'Consulta odontológica', 'pessoal', 1, 15, 30, 60, { location: 'Clínica Sorriso' }),
    ev('ev-5', 'Encontro da igreja', 'espiritualidade', -30, 19, 0, 90, { recurrence: 'FREQ=WEEKLY;BYDAY=SU' }),
    ev('ev-6', 'Revisão semanal', 'pessoal', -30, 17, 30, 45, { recurrence: 'FREQ=WEEKLY;BYDAY=SU' }),
    ev('ev-7', 'Almoço em família', 'pessoal', 3, 12, 30, 120, { location: 'Casa dos pais' }),
    ev('ev-8', 'Conversação em inglês (grupo)', 'ingles', -30, 19, 0, 60, { recurrence: 'FREQ=WEEKLY;BYDAY=WE' }),
  ];

  const habits: HabitRecord[] = [
    {
      id: 'habit-english',
      name: 'Estudar inglês',
      areaId: area('ingles'),
      goalId: 'goal-english',
      weekdays: [1, 2, 3, 4, 5],
      suggestedTime: '12:30',
      targetType: 'duration',
      targetValue: 40,
      targetUnit: 'min',
      notes: null,
      status: 'active',
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: 'habit-code',
      name: 'Programar',
      areaId: area('programacao'),
      goalId: 'goal-portfolio',
      weekdays: [1, 2, 3, 4, 5, 6],
      suggestedTime: '19:30',
      targetType: 'duration',
      targetValue: 90,
      targetUnit: 'min',
      notes: null,
      status: 'active',
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: 'habit-gym',
      name: 'Ir à academia',
      areaId: area('academia'),
      goalId: null,
      weekdays: [1, 2, 4, 5],
      suggestedTime: '06:30',
      targetType: 'check',
      targetValue: null,
      targetUnit: null,
      notes: null,
      status: 'active',
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: 'habit-devotional',
      name: 'Devocional',
      areaId: area('espiritualidade'),
      goalId: null,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      suggestedTime: '06:00',
      targetType: 'check',
      targetValue: null,
      targetUnit: null,
      notes: null,
      status: 'active',
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: 'habit-read',
      name: 'Ler',
      areaId: area('leitura'),
      goalId: null,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      suggestedTime: '22:00',
      targetType: 'quantity',
      targetValue: 20,
      targetUnit: 'páginas',
      notes: null,
      status: 'active',
      createdAt: iso(subMonths(now, 3)),
    },
    {
      id: 'habit-plan',
      name: 'Planejar o dia seguinte',
      areaId: area('pessoal'),
      goalId: null,
      weekdays: [0, 1, 2, 3, 4],
      suggestedTime: '21:30',
      targetType: 'check',
      targetValue: null,
      targetUnit: null,
      notes: null,
      status: 'paused',
      createdAt: iso(subMonths(now, 3)),
    },
  ];

  // Check-ins: a realistic mix. Misses are simply absent; two exceptional days are "skipped".
  const reliability: Record<string, number> = {
    'habit-english': 0.82,
    'habit-code': 0.74,
    'habit-gym': 0.78,
    'habit-devotional': 0.9,
    'habit-read': 0.6,
    'habit-plan': 0.5,
  };
  const checkins: HabitCheckin[] = [];
  for (const habit of habits) {
    for (let back = 90; back >= 1; back--) {
      const day = subDays(today, back);
      if (!habit.weekdays.includes(day.getDay())) continue;
      if (habit.status === 'paused' && back < 21) continue;
      const roll = rand();
      if (back === 12 || back === 11) {
        checkins.push({ habitId: habit.id, date: key(day), status: 'skipped', value: null, note: 'Viagem' });
      } else if (roll < (reliability[habit.id] ?? 0.7)) {
        checkins.push({
          habitId: habit.id,
          date: key(day),
          status: 'done',
          value: habit.targetValue,
          note: null,
        });
      }
    }
  }
  // Already done today
  checkins.push(
    { habitId: 'habit-devotional', date: key(today), status: 'done', value: null, note: null },
  );
  if (today.getDay() !== 0 && today.getDay() !== 3 && today.getDay() !== 6) {
    checkins.push({ habitId: 'habit-gym', date: key(today), status: 'done', value: null, note: null });
  }

  const goalBase = {
    description: null,
    areaId: null,
    lastActivityAt: null,
    createdAt: iso(subMonths(now, 3)),
    habitIds: [] as string[],
    openTaskCount: 0,
    doneTaskCount: 0,
    metric: null,
    linkedAccountId: null,
  };
  const goals: Goal[] = [
    {
      ...goalBase,
      id: 'goal-english',
      name: 'Conversar em inglês com confiança até dezembro de 2027',
      description:
        'Chegar ao nível intermediário com prática constante de listening, speaking e vocabulário.',
      category: 'intellectual',
      areaId: area('ingles'),
      status: 'active',
      startDate: key(subMonths(now, 3)),
      targetDate: '2027-12-01',
      progressMode: 'milestones',
      progress: 0,
      habitIds: ['habit-english'],
      lastActivityAt: iso(subDays(now, 1)),
      milestones: [
        { id: 'm1', title: 'Concluir o curso de gramática básica', done: true, dueDate: null, completedAt: iso(subDays(now, 40)), position: 0 },
        { id: 'm2', title: 'Aprender 500 palavras de vocabulário', done: true, dueDate: null, completedAt: iso(subDays(now, 12)), position: 1 },
        { id: 'm3', title: 'Assistir 10 episódios sem legenda', done: false, dueDate: '2027-03-01', completedAt: null, position: 2 },
        { id: 'm4', title: 'Primeira conversa de 30 minutos com um nativo', done: false, dueDate: '2027-08-01', completedAt: null, position: 3 },
      ],
      history: [],
      openTaskCount: 3,
      doneTaskCount: 14,
    },
    {
      ...goalBase,
      id: 'goal-reserve',
      name: 'Juntar R$ 10.000 de reserva de emergência',
      category: 'financial',
      status: 'active',
      startDate: key(subMonths(now, 3)),
      targetDate: '2027-06-30',
      progressMode: 'metric',
      progress: 0,
      metric: { kind: 'money', current: 0, target: 1_000_000, unit: 'R$' },
      linkedAccountId: 'acc-reserve',
      milestones: [],
      lastActivityAt: iso(subDays(now, 6)),
      history: [],
    },
    {
      ...goalBase,
      id: 'goal-portfolio',
      name: 'Publicar o primeiro projeto full stack no portfólio',
      category: 'professional',
      areaId: area('programacao'),
      status: 'active',
      startDate: key(subMonths(now, 2)),
      targetDate: '2027-02-28',
      progressMode: 'milestones',
      progress: 0,
      habitIds: ['habit-code'],
      lastActivityAt: iso(subDays(now, 2)),
      milestones: [
        { id: 'm5', title: 'Definir escopo e modelo de dados', done: true, dueDate: null, completedAt: iso(subDays(now, 30)), position: 0 },
        { id: 'm6', title: 'API com autenticação', done: false, dueDate: '2026-12-15', completedAt: null, position: 1 },
        { id: 'm7', title: 'Interface responsiva', done: false, dueDate: '2027-01-20', completedAt: null, position: 2 },
        { id: 'm8', title: 'Deploy e README', done: false, dueDate: '2027-02-28', completedAt: null, position: 3 },
      ],
      history: [],
      openTaskCount: 6,
      doneTaskCount: 9,
    },
    {
      ...goalBase,
      id: 'goal-bible',
      name: 'Ler a Bíblia inteira em um ano',
      category: 'spiritual',
      status: 'paused',
      startDate: key(subMonths(now, 3)),
      targetDate: '2027-01-01',
      progressMode: 'manual',
      progress: 38,
      milestones: [],
      lastActivityAt: iso(subDays(now, 28)),
      history: [],
    },
  ];

  const accounts: Account[] = [
    { id: 'acc-main', name: 'Conta principal', kind: 'checking', isReserved: false, initialBalanceCents: 120_000, balanceCents: 0, archived: false },
    { id: 'acc-reserve', name: 'Reserva de emergência', kind: 'reserve', isReserved: true, initialBalanceCents: 0, balanceCents: 0, archived: false },
    { id: 'acc-laptop', name: 'Notebook novo', kind: 'reserve', isReserved: true, initialBalanceCents: 0, balanceCents: 0, archived: false },
  ];

  const categories: FinanceCategory[] = [
    { id: 'cat-salary', name: 'Salário', kind: 'income', icon: 'banknote' },
    { id: 'cat-freela', name: 'Trabalhos extras', kind: 'income', icon: 'briefcase' },
    { id: 'cat-housing', name: 'Moradia', kind: 'expense', icon: 'house' },
    { id: 'cat-food', name: 'Alimentação', kind: 'expense', icon: 'utensils' },
    { id: 'cat-transport', name: 'Transporte', kind: 'expense', icon: 'bus' },
    { id: 'cat-study', name: 'Estudos', kind: 'expense', icon: 'graduation-cap' },
    { id: 'cat-health', name: 'Saúde', kind: 'expense', icon: 'heart-pulse' },
    { id: 'cat-leisure', name: 'Lazer', kind: 'expense', icon: 'popcorn' },
    { id: 'cat-other', name: 'Outros', kind: 'expense', icon: 'shapes' },
  ];

  const transactions: Transaction[] = [];
  let tid = 0;
  const tx = (t: Omit<Transaction, 'id' | 'createdAt' | 'toAccountId' | 'note' | 'categoryId'> &
    Partial<Pick<Transaction, 'toAccountId' | 'note' | 'categoryId'>>) =>
    transactions.push({
      id: `tx-${++tid}`,
      createdAt: iso(now),
      toAccountId: null,
      note: null,
      categoryId: null,
      ...t,
    });

  for (let m = 3; m >= 0; m--) {
    const base = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), m);
    const d = (day: number) => key(new Date(base.getFullYear(), base.getMonth(), day));
    const isCurrent = m === 0;
    const upTo = (day: number) => !isCurrent || day <= now.getDate();
    if (upTo(5)) tx({ type: 'income', description: 'Salário', amountCents: 520_000, date: d(5), accountId: 'acc-main', categoryId: 'cat-salary' });
    if (m !== 0 && m % 2 === 1) tx({ type: 'income', description: 'Projeto de site (freela)', amountCents: 90_000, date: d(18), accountId: 'acc-main', categoryId: 'cat-freela' });
    if (upTo(6)) tx({ type: 'expense', description: 'Aluguel', amountCents: 145_000, date: d(6), accountId: 'acc-main', categoryId: 'cat-housing' });
    if (upTo(8)) tx({ type: 'expense', description: 'Condomínio e contas da casa', amountCents: 38_000 + Math.round(rand() * 6000), date: d(8), accountId: 'acc-main', categoryId: 'cat-housing' });
    for (const [day, v] of [[3, 24_000], [10, 31_000], [17, 27_500], [24, 29_000]] as const) {
      if (upTo(day)) tx({ type: 'expense', description: 'Mercado', amountCents: v + Math.round(rand() * 5000), date: d(day), accountId: 'acc-main', categoryId: 'cat-food' });
    }
    if (upTo(12)) tx({ type: 'expense', description: 'Transporte (mensal)', amountCents: 22_000, date: d(12), accountId: 'acc-main', categoryId: 'cat-transport' });
    if (upTo(9)) tx({ type: 'expense', description: 'Faculdade (mensalidade)', amountCents: 54_000, date: d(9), accountId: 'acc-main', categoryId: 'cat-study' });
    if (upTo(14)) tx({ type: 'expense', description: 'Curso de inglês', amountCents: 12_900, date: d(14), accountId: 'acc-main', categoryId: 'cat-study' });
    if (upTo(15)) tx({ type: 'expense', description: 'Academia', amountCents: 11_900, date: d(15), accountId: 'acc-main', categoryId: 'cat-health' });
    if (upTo(20)) tx({ type: 'expense', description: 'Cinema e jantar', amountCents: 9_000 + Math.round(rand() * 14_000), date: d(20), accountId: 'acc-main', categoryId: 'cat-leisure' });
    if (upTo(2)) tx({ type: 'transfer', description: 'Aporte na reserva', amountCents: 80_000, date: d(2), accountId: 'acc-main', toAccountId: 'acc-reserve' });
    if (upTo(22)) tx({ type: 'transfer', description: 'Aporte no notebook', amountCents: 30_000, date: d(22), accountId: 'acc-main', toAccountId: 'acc-laptop' });
  }

  const thisMonth = format(now, 'yyyy-MM');
  const budgets = [
    { categoryId: 'cat-housing', month: thisMonth, limitCents: 190_000 },
    { categoryId: 'cat-food', month: thisMonth, limitCents: 120_000 },
    { categoryId: 'cat-transport', month: thisMonth, limitCents: 25_000 },
    { categoryId: 'cat-leisure', month: thisMonth, limitCents: 25_000 },
    { categoryId: 'cat-study', month: thisMonth, limitCents: 70_000 },
  ];

  const timeEntries: DemoDb['timeEntries'] = [];
  for (let back = 0; back < 14; back++) {
    const day = key(subDays(today, back));
    timeEntries.push(
      { date: day, areaId: area('programacao'), minutes: 40 + Math.round(rand() * 80) },
      { date: day, areaId: area('ingles'), minutes: 20 + Math.round(rand() * 30) },
    );
  }
  timeEntries.push({ date: key(today), areaId: area('academia'), minutes: 62 });

  return {
    projects,
    user,
    areas,
    board,
    tasks,
    events,
    habits,
    checkins,
    goals,
    accounts,
    categories,
    transactions,
    budgets,
    inbox: [
      {
        id: 'inbox-1',
        kind: 'idea',
        text: 'App para registrar vocabulário a partir de legendas de séries',
        createdAt: iso(subDays(now, 2)),
        processedAt: null,
      },
    ],
    focus: { [key(today)]: ['task-1', 'task-2', 'task-3'] },
    reflections: {},
    timeEntries,
  };
}
