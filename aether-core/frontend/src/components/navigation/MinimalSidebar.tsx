import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import React from 'react';
import { t } from '../../lib/i18n';
import { cn } from '@/lib/utils';
import { minimalNavItems, sidebarWidthClass, type SidebarMode } from './AppNavConfig';

interface MinimalSidebarProps {
  mode: SidebarMode;
  onToggleCollapse: () => void;
  userCollapsed: boolean;
}

export default function MinimalSidebar({ mode, onToggleCollapse, userCollapsed }: MinimalSidebarProps) {
  const showLabels = mode !== 'rail';

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-border/40 bg-card/20 transition-[width] duration-200 ease-out',
        sidebarWidthClass(mode)
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-border/40',
          showLabels ? 'gap-3 p-5' : 'justify-center p-4'
        )}
      >
        <div className="w-9 h-9 bg-[var(--color-accent)] rounded-[var(--radius-lg)] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        {showLabels && (
          <div className="min-w-0">
            <div className="font-semibold text-base tracking-tight text-[var(--color-text)] truncate">
              AETHER
            </div>
            <div className="text-[10px] text-[var(--color-text-subtle)] truncate">{t('brand.tagline')}</div>
          </div>
        )}
      </div>

      <div className="flex-1 px-2 py-5 overflow-auto">
        <ul className="space-y-1">
          {minimalNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-[var(--radius-lg)] text-sm transition-all focus-visible:shadow-[var(--shadow-focus)]',
                      showLabels ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
                      isActive
                        ? 'bg-muted/40 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground'
                    )
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-2 border-t border-border/40">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center rounded-[var(--radius-lg)] text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]/50 transition-colors',
            showLabels ? 'gap-2 px-3 py-2' : 'justify-center p-2'
          )}
          aria-label={userCollapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
        >
          {userCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {showLabels && <span>Inklappen</span>}
        </button>
      </div>
    </nav>
  );
}
