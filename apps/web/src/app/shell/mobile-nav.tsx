import { Menu, Plus } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ALL_NAV_ITEMS, MOBILE_TAB_PATHS } from '../navigation';
import { useLiquid } from '@/lib/use-liquid';
import { Sidebar } from './sidebar';

function Tab({ path }: { path: string }) {
  const item = ALL_NAV_ITEMS.find((i) => i.path === path);
  if (!item) return null;
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <Icon className="size-[19px]" aria-hidden />
      {item.label}
    </NavLink>
  );
}

export function MobileNav({ onCapture }: { onCapture: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [first, second, third] = MOBILE_TAB_PATHS;
  const liquid = useLiquid<HTMLDivElement>('x');

  return (
    <>
      <nav aria-label="Navegação móvel" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div ref={liquid} className="glass-strong pointer-events-auto relative mx-auto flex h-16 max-w-md items-stretch rounded-[22px] px-1.5">
          <Tab path={first} />
          <Tab path={second} />
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={onCapture}
              aria-label="Adicionar rápido"
              className="-mt-8 flex size-14 items-center justify-center rounded-full border border-white/45 text-primary-foreground shadow-[0_12px_30px_-6px_var(--primary),inset_0_1px_0_rgb(255_255_255/0.6)] transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--primary) 88%, white), var(--primary) 45%, color-mix(in oklab, var(--primary) 50%, var(--violet)))' }}
            >
              <Plus className="size-6" aria-hidden />
            </button>
          </div>
          <Tab path={third} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="size-[19px]" aria-hidden />
            Mais
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="w-[19rem] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Todos os módulos do RITMO</SheetDescription>
          </SheetHeader>
          <Sidebar onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
