import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './shell/app-shell';
import { ALL_NAV_ITEMS } from './navigation';
import { GuestOnly, RequireAuth } from './guards';
import { ComingSoonPage } from './coming-soon';
import { RouteError } from './route-error';

const pages = {
  '/agenda': () => import('@/features/agenda/agenda-page').then((m) => ({ Component: m.AgendaPage })),
  '/projetos': () => import('@/features/projects/projects-page').then((m) => ({ Component: m.ProjectsPage })),
  '/meu-dia': () => import('@/features/day/day-page').then((m) => ({ Component: m.DayPage })),
  '/tarefas': () => import('@/features/tasks/tasks-page').then((m) => ({ Component: m.TasksPage })),
  '/habitos': () => import('@/features/habits/habits-page').then((m) => ({ Component: m.HabitsPage })),
  '/objetivos': () => import('@/features/goals/goals-page').then((m) => ({ Component: m.GoalsPage })),
  '/financas': () => import('@/features/finance/finance-page').then((m) => ({ Component: m.FinancePage })),
} as const;

const moduleRoutes = ALL_NAV_ITEMS.map((item) => {
  const lazy = (pages as Record<string, (typeof pages)[keyof typeof pages] | undefined>)[item.path];
  return lazy
    ? { path: item.path.slice(1), lazy }
    : { path: item.path.slice(1), element: <ComingSoonPage item={item} /> };
});

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      {
        path: '/entrar',
        lazy: () => import('@/features/auth/auth-page').then((m) => ({ Component: m.LoginPage })),
      },
      {
        path: '/cadastro',
        lazy: () => import('@/features/auth/auth-page').then((m) => ({ Component: m.RegisterPage })),
      },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/meu-dia" replace /> },
          ...moduleRoutes,
          {
            path: 'projetos/:id',
            lazy: () =>
              import('@/features/projects/project-detail-page').then((m) => ({
                Component: m.ProjectDetailPage,
              })),
          },
          { path: '*', element: <Navigate to="/meu-dia" replace /> },
        ],
      },
    ],
  },
]);
