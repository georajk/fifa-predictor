"use client";

import { useCallback, useSyncExternalStore } from "react";

const storageKey = "fifa-predictor-user";
const playerStorageEvent = "fifa-predictor-user-change";

function getStoredPlayer() {
  return window.localStorage.getItem(storageKey) ?? "";
}

function getServerStoredPlayer() {
  return "";
}

function subscribeToStoredPlayer(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(playerStorageEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(playerStorageEvent, onStoreChange);
  };
}

export function useStoredPlayer() {
  const userName = useSyncExternalStore(
    subscribeToStoredPlayer,
    getStoredPlayer,
    getServerStoredPlayer,
  );

  const setUserName = useCallback((nextUserName: string) => {
    window.localStorage.setItem(storageKey, nextUserName);
    window.dispatchEvent(new Event(playerStorageEvent));
  }, []);

  return [userName, setUserName] as const;
}
