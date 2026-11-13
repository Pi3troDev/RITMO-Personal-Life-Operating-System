import type { Habit, HabitCheckin } from '@ritmo/shared';
import { addDays, startOfWeek, subWeeks } from 'date-fns';
import { toDateKey, todayKey, WEEKDAY_INITIAL } from '@/lib/dates';
import { cn } from '@/lib/utils';

const WEEKS = 12;

/**
 * Last 12 weeks, one column per week (Mon→Sun).
 * Filled = done · dashed = exceptional day · faint = scheduled, not registered · empty = not scheduled.
 * A day without a record is never drawn as a failure.
 */
export function ConsistencyCalendar({ habit, checkins }: { habit: Habit; checkins: HabitCheckin[] }) {
  const byDate = new Map(checkins.filter((c) => c.habitId === habit.id).map((c) => [c.date, c.status] as const));
  const today = todayKey();
  const start = startOfWeek(subWeeks(new Date(), WEEKS - 1), { weekStartsOn: 1 });

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );

  return (
    <div className="flex gap-1" role="img" aria-label={`Calendário de consistência de ${habit.name}: últimas ${WEEKS} semanas`}>
      <div className="mr-1 flex flex-col gap-1" aria-hidden>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <span key={day} className="flex h-3 items-center text-[9px] leading-none text-subtle-foreground">
            {WEEKDAY_INITIAL[day]}
          </span>
        ))}
      </div>
      {weeks.map((week, w) => (
        <div key={w} className="flex flex-col gap-1">
          {week.map((day) => {
            const key = toDateKey(day);
            const future = key > today;
            const scheduled = habit.weekdays.includes(day.getDay());
            const status = byDate.get(key);
            return (
              <span
                key={key}
                title={`${key}${status === 'done' ? ' — feito' : status === 'skipped' ? ' — dia excepcional' : ''}`}
                className={cn(
                  'size-3 rounded-[3px]',
                  future && 'opacity-0',
                  status === 'done' && 'bg-primary',
                  status === 'skipped' && 'border border-dashed border-muted-foreground/60',
                  !status && scheduled && !future && 'bg-muted',
                  !status && !scheduled && 'bg-transparent',
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
