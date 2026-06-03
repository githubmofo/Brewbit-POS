import { create } from "zustand";

interface ActiveSession {
  id: string;
  userId: string;
  status: "open" | "closed";
  openingBalance: string;
  openedAt: string | Date;
}

interface SessionState {
  activeSession: ActiveSession | null;
  setSession: (session: ActiveSession) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,

  // Set the current cashier register session details
  setSession: (session) => set({ activeSession: session }),

  // Clear register details on checkout signout
  clearSession: () => set({ activeSession: null }),
}));
export type UseSessionStore = typeof useSessionStore;
