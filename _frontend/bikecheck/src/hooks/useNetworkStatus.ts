import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { useOfflineWhenCallApiStore } from "../store/store";

export interface UseNetworkStatusResult {
  isOnline: boolean;
  recheck: () => void;
}

export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    void Network.getStatus().then((status) => setIsOnline(status.connected));

    const listener = Network.addListener("networkStatusChange", (status) => {
      setIsOnline(status.connected);
      if (status.connected) {
        useOfflineWhenCallApiStore.getState().setOfflineWhenCallApi(false);
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  const recheck = (): void => {
    void Network.getStatus().then((status) => setIsOnline(status.connected));
  };

  return { isOnline, recheck };
}
