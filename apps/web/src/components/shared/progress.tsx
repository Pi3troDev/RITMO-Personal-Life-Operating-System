import { useId } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  className?: string;
  /** CSS colour value; defaults to the accent. */
  color?: string;
  label?: string;
}

export function ProgressBar({ value, className, color, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08] shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)]', className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-out"
        style={{
          width: `${clamped}%`,
          background: color ?? 'linear-gradient(90deg, var(--primary), var(--cyan) 60%, var(--sky))',
          boxShadow: `0 0 14px -2px ${color ?? 'var(--primary)'}`,
        }}
      />
    </div>
  );
}

interface ProgressRingProps {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  label: string;
}

/** Circular progress. Describes what was done; it never grades the day. */
export function ProgressRing({ value, size = 64, stroke = 5, className, children, label }: ProgressRingProps) {
  const gradientId = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_55%,transparent)]" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="55%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-foreground/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          className="transition-[stroke-dashoffset] duration-[var(--duration-slow)] ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular">
        {children}
      </span>
    </div>
  );
}
