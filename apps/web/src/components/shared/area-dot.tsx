import type { Area } from '@ritmo/shared';
import { areaColorVar } from '@/lib/area-color';
import { cn } from '@/lib/utils';

export function AreaDot({ area, className }: { area?: Area; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: areaColorVar(area?.color) }}
    />
  );
}

export function AreaLabel({ area, className }: { area?: Area; className?: string }) {
  if (!area) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <AreaDot area={area} />
      {area.name}
    </span>
  );
}
