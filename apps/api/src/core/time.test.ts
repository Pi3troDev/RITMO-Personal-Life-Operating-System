import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dayRange,
  diffDays,
  endOfMonth,
  localDateOf,
  localMinutesOf,
  startOfWeek,
  weekdayOf,
  zonedInstant,
} from './time';

const SP = 'America/Sao_Paulo';

describe('datas e fusos', () => {
  it('o dia local depende do fuso: 02:30 UTC ainda é "ontem" em São Paulo', () => {
    const instant = new Date('2026-11-19T02:30:00Z');
    expect(localDateOf(instant, SP)).toBe('2026-11-18');
    expect(localDateOf(instant, 'UTC')).toBe('2026-11-19');
    expect(localDateOf(instant, 'Asia/Tokyo')).toBe('2026-11-19');
  });

  it('zonedInstant e localMinutesOf são inversos', () => {
    const instant = zonedInstant('2026-11-18', 9 * 60 + 30, SP);
    expect(instant.toISOString()).toBe('2026-11-18T12:30:00.000Z');
    expect(localMinutesOf(instant, SP)).toBe(570);
  });

  it('dayRange cobre 24h locais', () => {
    const { start, end } = dayRange('2026-11-18', SP);
    expect(start.toISOString()).toBe('2026-11-18T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-19T03:00:00.000Z');
  });

  it('aritmética de calendário', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(diffDays('2026-11-18', '2026-11-01')).toBe(17);
    expect(weekdayOf('2026-11-18')).toBe(3);
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -2)).toBe('2025-11');
  });

  it('início da semana: segunda (1) ou domingo (0)', () => {
    expect(startOfWeek('2026-11-18', 1)).toBe('2026-11-16');
    expect(startOfWeek('2026-11-18', 0)).toBe('2026-11-15');
    expect(startOfWeek('2026-11-22', 1)).toBe('2026-11-16');
    expect(startOfWeek('2026-11-16', 1)).toBe('2026-11-16');
  });
});
