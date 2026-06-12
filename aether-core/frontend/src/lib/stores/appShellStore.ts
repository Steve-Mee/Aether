import { create } from 'zustand';

interface AppShellState {
  pendingApprovalsCount: number;
  lastCommandAt: string | null;
  setPendingApprovalsCount: (count: number) => void;
  setLastCommandAt: (at: string | null) => void;
}

export const useAppShellStore = create<AppShellState>()((set) => ({
  pendingApprovalsCount: 0,
  lastCommandAt: null,
  setPendingApprovalsCount: (count) => set({ pendingApprovalsCount: count }),
  setLastCommandAt: (at) => set({ lastCommandAt: at }),
}));
