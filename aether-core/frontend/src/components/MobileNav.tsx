import { Link, useLocation } from 'react-router-dom';
import { Menu, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import NotificationBell from '@/components/notifications/NotificationBell';
import LiveStatusChip from '@/components/shell/LiveStatusChip';
import { Sheet, SheetContent } from '@/components/ui';
import { useRef, useState } from 'react';
import React from 'react';
import { t } from '../lib/i18n';
import { merchantDisplayName } from '@/lib/merchantDisplay';
import { minimalNavItems, moduleLinks } from './navigation/AppNavConfig';
import { cn, focusRing } from '@/lib/utils';
import AetherBrandMark from '@/components/shell/AetherBrandMark';
import { usePermission } from '@/lib/auth/usePermission';
import { prefetchNavRoute } from '@/lib/navigation/navPrefetch';
import { prefetchPageChunk } from '@/lib/navigation/prefetchPageChunk';

interface MobileNavProps {
  onOpenCommand: () => void;
}

export default function MobileNav({ onOpenCommand }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const canManageSettings = usePermission('settings.manage');
  const queryClient = useQueryClient();

  const handleNavPrefetch = (path: string) => {
    prefetchNavRoute(queryClient, path);
    prefetchPageChunk(path);
  };

  return (
    <>
      <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 z-40">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'p-2 rounded-lg text-muted-foreground hover:text-foreground',
            'hover:bg-surface-elevated/50 transition-colors duration-fast',
            focusRing(),
          )}
          aria-label="Menu openen"
        >
          <Menu size={22} />
        </button>
        <div className="flex flex-col items-center gap-0.5 min-w-0 max-w-[42%]">
          <span className="font-semibold tracking-tight text-sm text-foreground">AETHER</span>
          <span className="text-caption text-muted-foreground truncate w-full text-center">
            {merchantDisplayName()}
          </span>
          <LiveStatusChip compact className="scale-90" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={onOpenCommand}
            className={cn(
              'p-2 rounded-lg bg-primary/15 text-primary',
              'hover:bg-primary/25 transition-colors duration-fast',
              'motion-safe:active:scale-[0.97]',
              focusRing(),
            )}
            aria-label={t('command.palette.title')}
          >
            <Sparkles size={22} />
          </button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showClose={false}
          className="w-64 p-0 gap-0 lg:hidden"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            menuButtonRef.current?.focus();
          }}
        >
          <nav aria-label="Mobiele navigatie" className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b border-border/40">
              <AetherBrandMark size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm tracking-tight text-foreground">AETHER</div>
                <div className="text-caption text-muted-foreground truncate">
                  {t('brand.tagline')}
                </div>
              </div>
            </div>
            <ul className="p-4 space-y-1 flex-1 overflow-auto">
              {minimalNavItems.map((link) => {
                const Icon = link.icon;
                const label = link.labelKey ? t(link.labelKey) : link.label;
                const active = link.end
                  ? location.pathname === link.to
                  : location.pathname.startsWith(link.to);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      onTouchStart={() => handleNavPrefetch(link.to)}
                      onFocus={() => handleNavPrefetch(link.to)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors duration-fast',
                        focusRing(),
                        active
                          ? 'bg-muted/40 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
              {canManageSettings && (
                <li>
                  <Link
                    to={moduleLinks.settings}
                    onClick={() => setOpen(false)}
                    onTouchStart={() => handleNavPrefetch(moduleLinks.settings)}
                    onFocus={() => handleNavPrefetch(moduleLinks.settings)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors duration-fast',
                      focusRing(),
                      location.pathname.startsWith('/settings')
                        ? 'bg-muted/40 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground',
                    )}
                    aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
                  >
                    <SettingsIcon size={18} aria-hidden />
                    {t('nav.settings')}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
