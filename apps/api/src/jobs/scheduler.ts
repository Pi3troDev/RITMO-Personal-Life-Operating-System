import type { Db } from '../core/db';
import type { Logger } from '../core/logger';
import { clock } from '../core/clock';
import { generateReminders } from '../modules/notifications/reminders';

/** Roda o gerador de lembretes a cada minuto dentro do próprio processo da API. */
export function startScheduler(db: Db, logger: Logger, intervalMs = 60_000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const created = await generateReminders(db, clock.now());
      if (created > 0) logger.info({ created }, 'lembretes gerados');
    } catch (err) {
      logger.error({ err }, 'falha ao gerar lembretes');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
