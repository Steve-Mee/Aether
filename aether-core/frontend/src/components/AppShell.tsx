import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NaturalLanguageBar from './command/NaturalLanguageBar';
import MobileNav from './MobileNav';
import AppTopBar from './shell/AppTopBar';
import { NotificationPopover } from './notifications/NotificationPopover';
import { useCommandUiStore } from '@/lib/stores/uiStore';
import { isCommandCenterHome } from '@/lib/navigation/routes';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';

const CommandPalette = lazy(() => import('./CommandPalette'));
const AISidecar = lazy(() => import('./AISidecar'));

/** Persistent app shell — renders nested routes via Outlet. */
export default function AppShell() {
  const openPalette = useCommandUiStore((s) => s.openPalette);
  const { pathname } = useLocation();
  const onHome = isCommandCenterHome(pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const state = useCommandUiStore.getState();
        if (state.paletteOpen) state.closePalette();
        else state.openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <NotificationPopover>
      <div className="flex h-screen bg-background text-white overflow-hidden">
        <a
          href="#main-content"
          className={cn(
            'sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4',
            'focus:px-4 focus:py-2 focus:rounded-lg focus:bg-card focus:text-foreground focus:border focus:border-border/40',
            focusRing(),
          )}
        >
          {t('a11y.skipToMain')}
        </a>
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav onOpenCommand={openPalette} />
          <AppTopBar />

          {!onHome && (
            <div
              className={cn(
                'border-b border-border/40 bg-card/30 backdrop-blur-xl',
                'shadow-[0_1px_0_0_rgba(255,255,255,0.04)]',
                'px-4 py-3 sm:px-5 sm:py-4 sticky top-0 z-30',
              )}
              data-testid="global-command-bar-shell"
            >
              <NaturalLanguageBar />
            </div>
          )}

          <div className={cn('flex flex-1 min-h-0', onHome && 'command-center-workspace')}>
            <main
              id="main-content"
              tabIndex={-1}
              className={cn(
                'flex-1 min-w-0 overflow-auto',
                onHome
                  ? 'command-center-canvas p-4 sm:p-5 lg:px-6 lg:py-7'
                  : 'bg-background p-4 sm:p-6 lg:px-8 lg:py-8',
              )}
              role="main"
            >
              <Outlet />
            </main>
            {!onHome && (
              <Suspense fallback={null}>
                <AISidecar />
              </Suspense>
            )}
          </div>
        </div>

        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      </div>
    </NotificationPopover>
  );
}

/** @deprecated Use AppShell — kept for backward compatibility during migration. */
export { default as Layout } from './AppShell';
