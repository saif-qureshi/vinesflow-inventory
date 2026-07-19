import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  accessToken: string | null;
  currentOrgId: number | null;
  setAccessToken: (token: string | null) => void;
  setCurrentOrgId: (id: number | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      currentOrgId: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setCurrentOrgId: (currentOrgId) => set({ currentOrgId }),
      clear: () => set({ accessToken: null }),
    }),
    {
      name: "vf-session",
      partialize: (state) => ({ currentOrgId: state.currentOrgId }),
    },
  ),
);
