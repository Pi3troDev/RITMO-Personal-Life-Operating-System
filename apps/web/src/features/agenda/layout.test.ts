import type { AgendaItem } from '@ritmo/shared';
import { describe, expect, it } from 'vitest';
import { GRID_HEIGHT, HOUR_PX, HOUR_START, MIN_BLOCK_PX, layoutDay, offsetForMinutes } from './layout';

const day = new Date(2026, 10, 12);

function item(id: string, startH: number, startM: number, endH: number, endM: number): AgendaItem {
  return {
    id,
    kind: 'event',
    refId: id,
    title: id,
    areaId: null,
    start: new Date(2026, 10, 12, startH, startM).toISOString(),
    end: new Date(2026, 10, 12, endH, endM).toISOString(),
    allDay: false,
    status: 'scheduled',
    recurring: false,
    conflict: false,
    recurrence: null,
    location: null,
    reminderMinutes: null,
  };
}

describe('offsetForMinutes', () => {
  it('maps the first visible hour to the top and clamps outside the visible range', () => {
    expect(offsetForMinutes(HOUR_START * 60)).toBe(0);
    expect(offsetForMinutes(0)).toBe(0);
    expect(offsetForMinutes(23 * 60 + 59 + 120)).toBe(GRID_HEIGHT);
  });

  it('uses one hour per HOUR_PX', () => {
    expect(offsetForMinutes((HOUR_START + 2) * 60)).toBe(2 * HOUR_PX);
  });
});

describe('layoutDay', () => {
  it('gives a lone block the full width', () => {
    const [block] = layoutDay([item('a', 9, 0, 10, 0)], day);
    expect(block).toMatchObject({ column: 0, columns: 1, top: 3 * HOUR_PX, height: HOUR_PX });
  });

  it('puts overlapping blocks in different columns of the same cluster', () => {
    const blocks = layoutDay([item('a', 14, 0, 15, 0), item('b', 14, 30, 15, 0)], day);
    expect(blocks.map((b) => [b.item.id, b.column, b.columns])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ]);
  });

  it('does not mix blocks that merely touch', () => {
    const blocks = layoutDay([item('a', 9, 0, 10, 0), item('b', 10, 0, 11, 0)], day);
    expect(blocks.every((b) => b.columns === 1 && b.column === 0)).toBe(true);
  });

  it('reuses a free column inside a cluster', () => {
    const blocks = layoutDay(
      [item('a', 9, 0, 12, 0), item('b', 9, 30, 10, 0), item('c', 10, 30, 11, 0)],
      day,
    );
    const byId = Object.fromEntries(blocks.map((b) => [b.item.id, b]));
    expect(byId.a?.column).toBe(0);
    expect(byId.b?.column).toBe(1);
    expect(byId.c?.column).toBe(1);
    expect(blocks.every((b) => b.columns === 2)).toBe(true);
  });

  it('keeps very short blocks readable', () => {
    const [block] = layoutDay([item('a', 9, 0, 9, 10)], day);
    expect(block?.height).toBe(MIN_BLOCK_PX);
  });

  it('ignores items from other days and all-day items', () => {
    const other = { ...item('x', 9, 0, 10, 0), start: new Date(2026, 10, 13, 9).toISOString(), end: new Date(2026, 10, 13, 10).toISOString() };
    const allDay = { ...item('y', 0, 0, 23, 59), allDay: true };
    expect(layoutDay([other, allDay], day)).toEqual([]);
  });
});
