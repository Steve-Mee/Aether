import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NaturalLanguageBar from './command/NaturalLanguageBar';
import AISidecar from './AISidecar';
import CommandPalette from './CommandPalette';
import MobileNav from './MobileNav';
import { useCommand } from '../lib/CommandContext';
import { isCommandCenterHome } from './navigation/AppNavConfig';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { openPalette } = useCommand();
  const { pathname } = useLocation();
  const onHome = isCommandCenterHome(pathname);

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-white overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav onOpenCommand={openPalette} />

        {!onHome && (
          <div
            className={cn(
              'border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 backdrop-blur-xl',
              'p-3 sm:p-4 sticky top-0 z-30'
            )}
          >
            <NaturalLanguageBar />
          </div>
        )}

        <div className={cn('flex flex-1 min-h-0', onHome && 'command-center-workspace')}>
          <main
            id="main-content"
            className={cn(
              'flex-1 min-w-0 overflow-auto',
              onHome
                ? 'command-center-canvas p-4 sm:p-5 lg:px-5 lg:py-7'
                : 'bg-[var(--color-bg)] p-4 sm:p-8'
            )}
            role="main"
          >
            {children}
          </main>
          <AISidecar />
        </div>
      </div>

      <CommandPalette />
    </div>
  );
}
