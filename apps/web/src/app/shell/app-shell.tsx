import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useSessionExpiry } from '@/features/auth/api';
import { QuickCapture } from '@/features/capture/quick-capture';
import { DEMO_MODE } from '@/lib/env';
import { cn } from '@/lib/utils';
import { CommandPalette } from './command-palette';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

const COLLAPSE_KEY = 'ritmo:sidebar-collapsed';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  useSessionExpiry();

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, current ? '0' : '1');
      } catch {
        /* preference just won't persist */
      }
      return !current;
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key.toLowerCase() === 'a' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTypingTarget(event.target) || document.querySelector('[role="dialog"]')) return;
        event.preventDefault();
        setCaptureOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative isolate min-h-dvh lg:flex lg:h-dvh lg:gap-2.5 lg:overflow-hidden lg:p-2.5">
      {/* Refração do vidro líquido: usada pelo indicador deslizante (Chromium; os demais ignoram). */}
      <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden focusable="false">
        <filter id="liquid-lens" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.03" numOctaves={2} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Ir para o conteúdo
      </a>

      <aside
        className={cn(
          'glass relative hidden shrink-0 overflow-hidden rounded-2xl transition-[width] duration-[var(--duration-base)] ease-out lg:block',
          collapsed ? 'w-[4.25rem]' : 'w-sidebar',
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className="glass-panel relative flex min-w-0 flex-1 flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--glass-border)] lg:shadow-[inset_0_1px_0_var(--glass-highlight),0_30px_80px_-30px_var(--glass-shadow)]">
        {DEMO_MODE ? (
          <div className="bg-warning-soft/80 px-4 py-1 text-center text-[11px] text-foreground backdrop-blur">
            <strong className="font-medium">Modo demonstração</strong> · dados de exemplo, nada é salvo no
            servidor
          </div>
        ) : null}

        <header className="glass-bar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--glass-border)] px-4 lg:px-7">
          <span className="text-base font-semibold tracking-tight lg:hidden">RITMO</span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="glass relative hidden h-9 w-72 items-center gap-2.5 rounded-full px-3.5 text-[13px] text-muted-foreground transition-all hover:-translate-y-px hover:text-foreground lg:flex"
          >
            <Search className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">Buscar ou ir para…</span>
            <kbd className="rounded-md border border-border/70 px-1.5 py-px font-sans text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setPaletteOpen(true)}
              aria-label="Buscar ou ir para"
            >
              <Search />
            </Button>
            <Button onClick={() => setCaptureOpen(true)} className="hidden h-9 gap-1.5 rounded-full pl-3.5 pr-3 lg:inline-flex">
              <Plus aria-hidden />
              Adicionar
              <kbd className="ml-1 rounded-md border border-primary-foreground/25 px-1.5 py-px font-sans text-[10px]">A</kbd>
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main id="conteudo" className="scrollbar-glass flex-1 lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-content px-4 py-6 pb-32 lg:px-8 lg:py-8 lg:pb-12">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav onCapture={() => setCaptureOpen(true)} />
      <QuickCapture open={captureOpen} onOpenChange={setCaptureOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onCapture={() => setCaptureOpen(true)}
      />
    </div>
  );
}
