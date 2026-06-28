import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveSidebarMode } from '@/lib/navigation/routes';
import { useSidebarStore } from '@/lib/stores/uiStore';

export function useSidebarMode() {
  const { pathname } = useLocation();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  const mode = useMemo(() => resolveSidebarMode(pathname, collapsed), [pathname, collapsed]);

  return { mode, userCollapsed: collapsed, toggleCollapsed, pathname };
}
