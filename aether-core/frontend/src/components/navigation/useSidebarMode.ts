import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveSidebarMode, type SidebarMode } from './AppNavConfig';

export function useSidebarMode() {
  const { pathname } = useLocation();
  const [userCollapsed, setUserCollapsed] = useState(false);

  const mode: SidebarMode = useMemo(
    () => resolveSidebarMode(pathname, userCollapsed),
    [pathname, userCollapsed]
  );

  const toggleCollapsed = () => setUserCollapsed((c) => !c);

  return { mode, userCollapsed, toggleCollapsed, pathname };
}
