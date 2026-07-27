import { create } from "zustand";

interface NetworkStore {
  isOfflineWhenCallApi: boolean;
  setOfflineWhenCallApi: (value: boolean) => void;
}

export const useOfflineWhenCallApiStore = create<NetworkStore>((set) => ({
  isOfflineWhenCallApi: false,
  setOfflineWhenCallApi: (value) => set({ isOfflineWhenCallApi: value }),
}));
