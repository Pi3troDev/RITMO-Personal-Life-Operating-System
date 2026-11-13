import type { AgendaItem } from '@ritmo/shared';
import { isSameDay } from 'date-fns';

export const HOUR_START = 6;
export const HOUR_END = 24;
export const HOUR_PX = 56;
export const MIN_BLOCK_PX = 24;
export const GRID_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX;

export interface PositionedItem {
  item: AgendaItem;
  /** px from the top of the grid */
  top: number;
  height: number;
  /** column index inside its overlap cluster, and the cluster's column count */
  column: number;
  columns: number;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Vertical position of a time of day in the grid, clamped to the visible hours. */
export function offsetForMinutes(minutes: number): number {
  const clamped = Math.min(Math.max(minutes, HOUR_START * 60), HOUR_END * 60);
  return ((clamped - HOUR_START * 60) / 60) * HOUR_PX;
}

/**
 * Places the timed items of one day on the grid. Items that overlap are split into side-by-side
 * columns inside their cluster, so no block is ever hidden behind another.
 */
export function layoutDay(items: AgendaItem[], day: Date): PositionedItem[] {
  const timed = items
    .filter((i) => !i.allDay && isSameDay(new Date(i.start), day))
    .map((item) => {
      const start = minutesOfDay(new Date(item.start));
      const end = Math.max(minutesOfDay(new Date(item.end)), start + 15);
      return { item, start, end };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const result: PositionedItem[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  function flush() {
    const columnEnds: number[] = [];
    const placed = cluster.map((entry) => {
      let column = columnEnds.findIndex((end) => end <= entry.start);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = entry.end;
      return { entry, column };
    });
    for (const { entry, column } of placed) {
      const top = offsetForMinutes(entry.start);
      const bottom = offsetForMinutes(entry.end);
      result.push({
        item: entry.item,
        top,
        height: Math.max(bottom - top, MIN_BLOCK_PX),
        column,
        columns: columnEnds.length,
      });
    }
    cluster = [];
  }

  for (const entry of timed) {
    if (cluster.length > 0 && entry.start >= clusterEnd) flush();
    cluster.push(entry);
    clusterEnd = cluster.length === 1 ? entry.end : Math.max(clusterEnd, entry.end);
  }
  if (cluster.length > 0) flush();
  return result;
}
