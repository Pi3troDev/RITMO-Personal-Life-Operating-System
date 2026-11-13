import { describe, expect, it } from 'vitest';
import { isAgendaView, rangeLabel, shiftAnchor, visibleDays, visibleRange } from './range';

const thursday = new Date(2026, 10, 12); // 12 Nov 2026

describe('visibleDays', () => {
  it('returns only the anchor in day view', () => {
    expect(visibleDays('dia', thursday, 1)).toEqual([thursday]);
  });

  it('returns seven days starting on the configured week start', () => {
    const monday = visibleDays('semana', thursday, 1);
    expect(monday).toHaveLength(7);
    expect(visibleRange(monday)).toEqual({ from: '2026-11-09', to: '2026-11-15' });

    const sunday = visibleDays('semana', thursday, 0);
    expect(visibleRange(sunday)).toEqual({ from: '2026-11-08', to: '2026-11-14' });
  });

  it('fills the month grid with whole weeks around the month', () => {
    const days = visibleDays('mes', thursday, 1);
    expect(days.length % 7).toBe(0);
    expect(visibleRange(days)).toEqual({ from: '2026-10-26', to: '2026-12-06' });
  });
});

describe('shiftAnchor', () => {
  it('moves by one day, week or month', () => {
    expect(shiftAnchor('dia', thursday, 1)).toEqual(new Date(2026, 10, 13));
    expect(shiftAnchor('semana', thursday, -1)).toEqual(new Date(2026, 10, 5));
    expect(shiftAnchor('mes', thursday, 1)).toEqual(new Date(2026, 11, 12));
  });
});

describe('rangeLabel', () => {
  it('describes each view in Portuguese', () => {
    expect(rangeLabel('dia', thursday, [thursday])).toBe('Quinta-feira, 12 de novembro');
    expect(rangeLabel('mes', thursday, [])).toBe('Novembro de 2026');
    expect(rangeLabel('semana', thursday, visibleDays('semana', thursday, 1))).toBe('9 – 15 nov 2026');
  });
});

describe('isAgendaView', () => {
  it('accepts only known views', () => {
    expect(isAgendaView('semana')).toBe(true);
    expect(isAgendaView('ano')).toBe(false);
    expect(isAgendaView(null)).toBe(false);
  });
});
