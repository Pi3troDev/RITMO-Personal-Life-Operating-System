import type { Area } from '@ritmo/shared';

/** Colour token of a life area as a CSS value. Areas are the only place these tokens are used. */
export function areaColorVar(color: Area['color'] | undefined): string {
  return `var(--area-${color ?? 'outros'})`;
}
