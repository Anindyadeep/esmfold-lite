import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface SessionState {
  user: User | null;
  setUser: (user: User | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null }),
})); 