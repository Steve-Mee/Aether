import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeft, Settings as SettingsIcon } from 'lucide-react';
import React from 'react';
import { t } from '../../lib/i18n';
import { cn, focusRing } from '@/lib/utils';
import AetherBrandMark from '@/components/shell/AetherBrandMark';
import { minimalNavItems, moduleLinks, sidebarWidthClass, type SidebarMode } from './AppNavConfig';
import { prefetchNavRoute } from '@/lib/navigation/navPrefetch';
import { prefetchPageChunk } from '@/lib/navigation/prefetchPageChunk';
import SidebarActivityPreview from './SidebarActivityPreview';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import { usePermission } from '@/lib/auth/usePermission';

interface MinimalSidebarProps {
  mode: SidebarMode;
  onToggleCollapse: () => void;
  userCollapsed: boolean;
}

export default function MinimalSidebar({
  mode,
  onToggleCollapse,
  userCollapsed,
}: MinimalSidebarProps) {
  const canManageSettings = usePermission('settings.manage');
  const queryClient = useQueryClient();
  const showLabels = mode !== 'rail';
  const { notifications } = useNotifications();
  const pendingApprovalsCount = useAppShellStore((s) => s.pendingApprovalsCount);

  const handleNavPrefetch = (path: string) => {
    prefetchNavRoute(queryClient, path);
    prefetchPageChunk(path);
  };
  const hasActionUnread = notifications.some((n) => !n.read && n.severity === 'action');

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-border/40 bg-card/20 transition-[width] duration-200 ease-out',
        sidebarWidthClass(mode),
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-border/40',
          showLabels ? 'gap-3 p-5' : 'justify-center p-4',
        )}
      >
        <AetherBrandMark size="md" />
        {showLabels && (
          <div className="min-w-0">
            <div className="font-semibold text-sm tracking-tight text-foreground truncate">
              AETHER
            </div>
            <div className="text-caption text-muted-foreground truncate">{t('brand.tagline')}</div>
          </div>
        )}
      </div>

      <div className="flex-1 px-2 py-5 overflow-auto">
        <ul className="space-y-1">
          {minimalNavItems.map((item) => {
            const Icon = item.icon;
            const label = item.labelKey ? t(item.labelKey) : item.label;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={label}
                  aria-label={label}
                  onMouseEnter={() => handleNavPrefetch(item.to)}
                  onFocus={() => handleNavPrefetch(item.to)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-lg text-sm transition-all duration-fast',
                      focusRing(),
                      showLabels ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
                      isActive
                        ? 'bg-muted/40 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground',
                    )
                  }
                >
                  <span className="relative shrink-0">
                    <Icon size={18} aria-hidden="true" />
                    {(hasActionUnread &&
                      (item.to === moduleLinks.approvals || item.to === moduleLinks.activity)) ||
                    (pendingApprovalsCount > 0 && item.to === moduleLinks.approvals) ? (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  {showLabels && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-2 border-t border-border/40 space-y-1">
        {showLabels && mode === 'expanded' && (
          <div className="px-1">
            <SidebarActivityPreview />
          </div>
        )}
        {canManageSettings && (
          <NavLink
            to={moduleLinks.settings}
            title={t('nav.settings')}
            onMouseEnter={() => handleNavPrefetch(moduleLinks.settings)}
            onFocus={() => handleNavPrefetch(moduleLinks.settings)}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-sm transition-all duration-fast',
                focusRing(),
                showLabels ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
                isActive
                  ? 'bg-muted/40 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground',
              )
            }
          >
            <SettingsIcon size={18} aria-hidden="true" />
            {showLabels && <span className="truncate">{t('nav.settings')}</span>}
          </NavLink>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center rounded-lg text-xs text-muted-foreground hover:text-muted-foreground hover:bg-surface-elevated/50 transition-colors duration-fast',
            focusRing(),
            showLabels ? 'gap-2 px-3 py-2' : 'justify-center p-2',
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
