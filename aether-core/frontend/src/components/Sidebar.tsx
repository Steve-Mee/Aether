import React from 'react';
import MinimalSidebar from './navigation/MinimalSidebar';
import { useSidebarMode } from './navigation/useSidebarMode';

export default function Sidebar() {
  const { mode, userCollapsed, toggleCollapsed } = useSidebarMode();

  return (
    <MinimalSidebar mode={mode} onToggleCollapse={toggleCollapsed} userCollapsed={userCollapsed} />
  );
}
