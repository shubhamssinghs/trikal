"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  name: string | null;
  email: string | null;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  setUser: (name: string, email: string) => void;
  clearTokens: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      name: null,
      email: null,

      setTokens: (accessToken, refreshToken, expiresIn) =>
        set({
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        }),

      setUser: (name, email) => set({ name, email }),

      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, expiresAt: null, name: null, email: null }),

      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && Date.now() < expiresAt;
      },
    }),
    { name: "trikal-auth" }
  )
);
