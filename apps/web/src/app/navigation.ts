import {
  BookOpen,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Code,
  Compass,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  Languages,
  ListTodo,
  NotebookPen,
  Repeat,
  Settings,
  Sun,
  Wallet,
  BookHeart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Development phase (see PROJECT.md) in which the module becomes functional. */
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  description: string;
  /** Whether the screen is already built in this build. */
  ready: boolean;
}

export type Tone = 'primary' | 'violet' | 'sky' | 'coral' | 'amber';

/** CSS colour of each navigation tone (tokens from tokens.css). */
export const TONE_VAR: Record<Tone, string> = {
  primary: 'var(--primary)',
  violet: 'var(--violet)',
  sky: 'var(--sky)',
  coral: 'var(--coral)',
  amber: 'var(--amber)',
};

export interface NavGroup {
  label: string;
  tone: Tone;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Execução',
    tone: 'primary',
    items: [
      { path: '/meu-dia', label: 'Meu Dia', icon: Sun, phase: 2, ready: true, description: 'O painel de execução do seu dia.' },
      { path: '/agenda', label: 'Agenda', icon: CalendarDays, phase: 2, ready: true, description: 'Dia, semana e mês, com compromissos, recorrência e detecção de conflitos.' },
      { path: '/tarefas', label: 'Tarefas', icon: ListTodo, phase: 2, ready: true, description: 'Lista, Kanban e visões por prazo.' },
      { path: '/projetos', label: 'Projetos', icon: FolderKanban, phase: 2, ready: true, description: 'Agrupe tarefas em projetos e acompanhe o andamento.' },
    ],
  },
  {
    label: 'Direção',
    tone: 'violet',
    items: [
      { path: '/objetivos', label: 'Objetivos', icon: Compass, phase: 3, ready: true, description: 'Transforme o que você quer construir em marcos e hábitos.' },
      { path: '/habitos', label: 'Hábitos', icon: Repeat, phase: 3, ready: true, description: 'Consistência sustentável, sem punição.' },
    ],
  },
  {
    label: 'Desenvolvimento',
    tone: 'sky',
    items: [
      { path: '/estudos', label: 'Estudos', icon: GraduationCap, phase: 3, ready: false, description: 'Trilhas, aulas, sessões com cronômetro e metas semanais.' },
      { path: '/dev', label: 'Dev Space', icon: Code, phase: 3, ready: false, description: 'Projetos, roadmaps, cursos e portfólio.' },
      { path: '/ingles', label: 'Inglês', icon: Languages, phase: 3, ready: false, description: 'Vocabulário, frases e prática de listening, reading, speaking e writing.' },
      { path: '/leitura', label: 'Leitura', icon: BookOpen, phase: 3, ready: false, description: 'Sua biblioteca pessoal, progresso e citações.' },
    ],
  },
  {
    label: 'Vida',
    tone: 'coral',
    items: [
      { path: '/saude', label: 'Saúde', icon: Dumbbell, phase: 3, ready: false, description: 'Treinos, caminhadas e frequência semanal.' },
      { path: '/espiritualidade', label: 'Espiritualidade', icon: BookHeart, phase: 3, ready: false, description: 'Devocional, leituras, reflexões e orações.' },
      { path: '/financas', label: 'Finanças', icon: Wallet, phase: 4, ready: true, description: 'Contas, reservas, orçamento e objetivos financeiros.' },
    ],
  },
  {
    label: 'Reflexão',
    tone: 'amber',
    items: [
      { path: '/revisoes', label: 'Revisões', icon: NotebookPen, phase: 5, ready: false, description: 'Revisão semanal e mensal com os números da sua vida.' },
      { path: '/insights', label: 'Insights', icon: ChartNoAxesColumn, phase: 5, ready: false, description: 'Padrões calculados a partir dos seus próprios dados.' },
    ],
  },
];

export const SYSTEM_ITEMS: NavItem[] = [
  { path: '/notificacoes', label: 'Notificações', icon: Bell, phase: 6, ready: false, description: 'Lembretes, prazos e alertas que você escolhe receber.' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, phase: 1, ready: false, description: 'Perfil, tema, fuso horário, módulos ativos e áreas.' },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...SYSTEM_ITEMS];

/** Destinations that get a slot in the mobile bottom bar; everything else lives under "Mais". */
export const MOBILE_TAB_PATHS = ['/meu-dia', '/tarefas', '/habitos'] as const;
