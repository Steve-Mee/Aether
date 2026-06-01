import { Link, useLocation } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { t } from '../lib/i18n';
import { minimalNavItems } from './navigation/AppNavConfig';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onOpenCommand: () => void;
}

export default function MobileNav({ onOpenCommand }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] sticky top-0 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] focus-visible:shadow-[var(--shadow-focus)]"
          aria-label="Menu openen"
        >
          <Menu size={22} />
        </button>
        <span className="font-semibold tracking-tight">AETHER</span>
        <button
          type="button"
          onClick={onOpenCommand}
          className="p-2 rounded-lg bg-[var(--color-accent-muted)] text-[var(--color-accent)] focus-visible:shadow-[var(--shadow-focus)]"
          aria-label={t('command.palette.title')}
        >
          <Sparkles size={22} />
        </button>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed inset-y-0 left-0 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)] z-50 lg:hidden flex flex-col"
            aria-label="Mobiele navigatie"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
              <span className="font-semibold">AETHER</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Menu sluiten">
                <X size={20} />
              </button>
            </div>
            <ul className="p-4 space-y-1 flex-1 overflow-auto">
              {minimalNavItems.map((link) => {
                const Icon = link.icon;
                const active = link.end
                  ? location.pathname === link.to
                  : location.pathname.startsWith(link.to);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] text-sm',
                        active
                          ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)]'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
