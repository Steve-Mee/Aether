import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

interface CommandUiState {
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  setPaletteOpen: (open: boolean) => void;
}

interface NotificationUiState {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  openPanel: () => void;
}

/** Element focused before palette opened — restored on Escape. */
let paletteReturnFocusEl: HTMLElement | null = null;

export function getPaletteReturnFocus(): HTMLElement | null {
  return paletteReturnFocusEl;
}

function capturePaletteReturnFocus(): void {
  const active = document.activeElement;
  paletteReturnFocusEl = active instanceof HTMLElement ? active : null;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'aether:sidebar-collapsed' },
  ),
);

export const useCommandUiStore = create<CommandUiState>()((set) => ({
  paletteOpen: false,
  openPalette: () => {
    capturePaletteReturnFocus();
    set({ paletteOpen: true });
  },
  closePalette: () => set({ paletteOpen: false }),
  setPaletteOpen: (open) => {
    if (open) capturePaletteReturnFocus();
    set({ paletteOpen: open });
  },
}));

export const useNotificationUiStore = create<NotificationUiState>()((set) => ({
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
  openPanel: () => set({ panelOpen: true }),
}));
