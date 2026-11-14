import type { Deps } from './core/deps';
import type { AnyRoute } from './core/http/route';
import { accountRoutes } from './modules/account/account.routes';
import { agendaRoutes } from './modules/agenda/agenda.routes';
import { areasRoutes } from './modules/areas/areas.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { captureRoutes } from './modules/capture/capture.routes';
import { dayRoutes } from './modules/day/day.routes';
import { financeRoutes } from './modules/finance/finance.routes';
import { goalsRoutes } from './modules/goals/goals.routes';
import { habitsRoutes } from './modules/habits/habits.routes';
import { timeRoutes } from './modules/time/time.routes';
import { dataRoutes } from './modules/data/data.routes';
import { insightsRoutes } from './modules/insights/insights.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import { reviewsRoutes } from './modules/reviews/reviews.routes';
import { devRoutes } from './modules/dev/dev.routes';
import { englishRoutes } from './modules/english/english.routes';
import { healthRoutes } from './modules/health/health.routes';
import { notesRoutes } from './modules/notes/notes.routes';
import { readingRoutes } from './modules/reading/reading.routes';
import { spiritualRoutes } from './modules/spiritual/spiritual.routes';
import { studyRoutes } from './modules/study/study.routes';
import { targetsRoutes } from './modules/targets/targets.routes';
import { projectsRoutes } from './modules/projects/projects.routes';
import { boardsRoutes } from './modules/tasks/boards.routes';
import { createTasksService } from './modules/tasks/tasks.service';
import { tasksRoutes } from './modules/tasks/tasks.routes';
import { systemRoutes } from './modules/system/system.routes';

/** Todas as rotas da API, na ordem em que aparecem no Swagger. */
export function allRoutes(deps: Deps): AnyRoute[] {
  const tasks = createTasksService(deps.db);
  return [
    ...systemRoutes(deps),
    ...authRoutes(deps),
    ...accountRoutes(deps),
    ...areasRoutes(deps),
    ...boardsRoutes(deps, tasks),
    ...tasksRoutes(deps, tasks),
    ...projectsRoutes(deps),
    ...agendaRoutes(deps),
    ...dayRoutes(deps),
    ...captureRoutes(deps, tasks),
    ...habitsRoutes(deps),
    ...timeRoutes(deps),
    ...financeRoutes(deps),
    ...goalsRoutes(deps),
    ...studyRoutes(deps),
    ...devRoutes(deps),
    ...englishRoutes(deps),
    ...readingRoutes(deps),
    ...healthRoutes(deps),
    ...spiritualRoutes(deps),
    ...targetsRoutes(deps),
    ...notesRoutes(deps),
    ...reviewsRoutes(deps),
    ...insightsRoutes(deps),
    ...reportsRoutes(deps),
    ...notificationsRoutes(deps),
    ...dataRoutes(deps),
  ];
}
