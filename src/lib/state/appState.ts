"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MASTER_ACCESS_CODE } from "../data/types";

interface AppState {
  unlockedFundraisers: string[];
  unlock: (id: string, code: string, expectedCode: string) => boolean;
  lock: (id: string) => void;
  lockAll: () => void;
  isUnlocked: (id: string) => boolean;
}

export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      unlockedFundraisers: [],
      unlock: (id, code, expectedCode) => {
        const trimmed = code.trim();
        const ok =
          trimmed.length > 0 &&
          (trimmed === expectedCode || trimmed === MASTER_ACCESS_CODE);
        if (ok && !get().unlockedFundraisers.includes(id)) {
          set({ unlockedFundraisers: [...get().unlockedFundraisers, id] });
        }
        return ok;
      },
      lock: (id) =>
        set({ unlockedFundraisers: get().unlockedFundraisers.filter((x) => x !== id) }),
      lockAll: () => set({ unlockedFundraisers: [] }),
      isUnlocked: (id) => get().unlockedFundraisers.includes(id),
    }),
    {
      name: "fundraiser-app:unlocked",
    },
  ),
);
