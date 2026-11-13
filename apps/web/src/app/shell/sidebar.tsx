import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from '@/features/auth/api';
import { useLiquid } from '@/lib/use-liquid';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, SYSTEM_ITEMS, TONE_VAR, type NavItem, type Tone } from '../navigation';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', compact ? 'justify-center' : 'px-2')}>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/40 text-primary-foreground shadow-[0_8px_22px_-6px_var(--primary),inset_0_1px_0_rgb(255_255_255/0.5)]"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--primary) 85%, white), var(--primary) 50%, color-mix(in oklab, var(--primary) 50%, var(--violet)))',
        }}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h3l2.5-6 4 12 2.5-6H21" />
        </svg>
      </span>
      {compact ? (
        <span className="sr-only">RITMO</span>
      ) : (
        <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-[18px] font-semibold tracking-tight text-transparent">
          RITMO
        </span>
      )}
    </div>
  );
}

export function NavEntry({
  item,
  tone = 'primary',
  onNavigate,
  collapsed = false,
}: {
  item: NavItem;
  tone?: Tone;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      style={{ '--tone': TONE_VAR[tone] } as React.CSSProperties}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center rounded-xl border border-transparent text-[13.5px] transition-all duration-200',
          collapsed ? 'justify-center' : 'gap-3 px-3',
          isActive
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
              isActive
                ? 'bg-[color-mix(in_oklab,var(--tone)_30%,transparent)] text-[var(--tone)] shadow-[0_4px_14px_-2px_var(--tone)]'
                : 'bg-[color-mix(in_oklab,var(--tone)_14%,transparent)] text-[var(--tone)] group-hover:scale-110',
            )}
          >
            <Icon className="size-[15px]" aria-hidden />
          </span>
          {collapsed ? null : <span className="truncate">{item.label}</span>}
          {!collapsed && !item.ready ? (
            <span className="ml-auto rounded-full border border-white/10 bg-foreground/[0.06] px-1.5 py-px text-[10px] text-subtle-foreground">
              F{item.phase}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const { data: user } = useSession();
  const liquid = useLiquid<HTMLDivElement>('y');
  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <nav aria-label="Principal" className="flex h-full flex-col gap-4 px-2.5 pb-3 pt-3.5">
      <div className={cn('flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between pr-1')}>
        <Logo compact={collapsed} />
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className="flex size-8 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-white/15 hover:bg-foreground/[0.07] hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        ) : null}
      </div>

      <div ref={liquid} className="scrollbar-glass -mx-1 flex-1 space-y-4 overflow-y-auto px-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div className="mx-3 mb-1.5 h-px bg-foreground/[0.08]" aria-hidden />
            ) : (
              <p className="eyebrow px-3 pb-1.5">{group.label}</p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavEntry key={item.path} item={item} tone={group.tone} onNavigate={onNavigate} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-foreground/[0.08] pt-3">
          <div className="flex flex-col gap-0.5">
            {SYSTEM_ITEMS.map((item) => (
              <NavEntry key={item.path} item={item} tone="primary" onNavigate={onNavigate} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {user && !collapsed ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-foreground/[0.04] px-2.5 py-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-gradient-to-br from-primary/60 to-violet/50 text-[11px] font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium leading-tight">{user.name}</p>
              <p className="truncate text-[11px] leading-tight text-subtle-foreground">{user.email}</p>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
