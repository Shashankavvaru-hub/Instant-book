import { create } from "zustand";
import { User } from "@/types";

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setIsLoading: (v) => set({ isLoading: v }),
}));
