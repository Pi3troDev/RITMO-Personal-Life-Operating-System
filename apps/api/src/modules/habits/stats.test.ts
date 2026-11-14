import { describe, expect, it } from 'vitest';
import { habitStats, type CheckinStatus } from './stats';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const checks = (entries: Record<string, CheckinStatus>) => new Map(Object.entries(entries));

describe('habitStats', () => {
  const base = { weekdays: ALL_DAYS, createdDay: '2026-11-01', today: '2026-11-10' };

  it('sequência soma dias feitos seguidos', () => {
    const s = habitStats({
      ...base,
      checkins: checks({ '2026-11-07': 'done', '2026-11-08': 'done', '2026-11-09': 'done' }),
    });
    expect(s.currentStreak).toBe(3);
  });

  it('hoje sem registro não quebra a sequência (o dia ainda não acabou)', () => {
    const s = habitStats({
      ...base,
      checkins: checks({ '2026-11-08': 'done', '2026-11-09': 'done' }),
    });
    expect(s.currentStreak).toBe(2);
  });

  it('um dia agendado passado sem registro quebra a sequência', () => {
    const s = habitStats({
      ...base,
      checkins: checks({ '2026-11-07': 'done', '2026-11-09': 'done' }),
    });
    expect(s.currentStreak).toBe(1);
  });

  it('dia excepcional não soma nem quebra', () => {
    const s = habitStats({
      ...base,
      checkins: checks({
        '2026-11-07': 'done',
        '2026-11-08': 'skipped',
        '2026-11-09': 'done',
        '2026-11-10': 'done',
      }),
    });
    expect(s.currentStreak).toBe(3);
  });

  it('só conta os dias agendados', () => {
    // 2026-11-09 é segunda, 11-11 quarta; hábito só às segundas e quartas
    const s = habitStats({
      weekdays: [1, 3],
      createdDay: '2026-11-01',
      today: '2026-11-11',
      checkins: checks({
        '2026-11-02': 'done',
        '2026-11-04': 'done',
        '2026-11-09': 'done',
        '2026-11-11': 'done',
      }),
    });
    expect(s.currentStreak).toBe(4);
    expect(s.bestStreak).toBe(4);
  });

  it('melhor sequência guarda o recorde mesmo depois de quebrar', () => {
    const s = habitStats({
      weekdays: ALL_DAYS,
      createdDay: '2026-11-01',
      today: '2026-11-10',
      checkins: checks({
        '2026-11-01': 'done',
        '2026-11-02': 'done',
        '2026-11-03': 'done',
        '2026-11-04': 'done',
        '2026-11-08': 'done',
        '2026-11-09': 'done',
      }),
    });
    expect(s.bestStreak).toBe(4);
    expect(s.currentStreak).toBe(2);
  });

  it('taxa de 30 dias ignora dias excepcionais e dias anteriores à criação', () => {
    const s = habitStats({
      weekdays: ALL_DAYS,
      createdDay: '2026-11-05',
      today: '2026-11-10',
      checkins: checks({
        '2026-11-05': 'done',
        '2026-11-06': 'done',
        '2026-11-07': 'skipped',
        '2026-11-08': 'done',
      }),
    });
    // dias avaliados: 5,6,8,9 (7 excepcional fora) → 3 feitos de 4
    expect(s.rate30d).toBeCloseTo(0.75);
  });

  it('sem nada agendado a taxa é 0, não NaN', () => {
    expect(habitStats({ ...base, weekdays: [], checkins: checks({}) }).rate30d).toBe(0);
  });
});
