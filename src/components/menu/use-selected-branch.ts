"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The branch the visitor is ordering from, remembered in localStorage. The
 * cart (Phase 2) takes this over. Server render and hydration use the first
 * branch, so there is never a mismatch.
 */

const KEY = "kithul.branch";
const EVENT = "kithul:branch-change";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useSelectedBranch(branchIds: string[]): [string, (id: string) => void] {
  const saved = useSyncExternalStore(subscribe, read, () => null);
  const fallback = branchIds[0] ?? "";
  const current = saved && branchIds.includes(saved) ? saved : fallback;

  const select = useCallback((id: string) => {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // Private mode or storage disabled: the choice lasts for this page only.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [current, select];
}
