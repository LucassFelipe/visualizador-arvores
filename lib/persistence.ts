import { isValidTree } from "./bst";
import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import type { Tree } from "./types";

interface StoredPayload {
  version: number;
  tree: Tree;
}

export function loadStoredTree(): Tree | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const payload = parsed as Partial<StoredPayload>;
    if (payload.version !== STORAGE_VERSION) return null;
    if (!isValidTree(payload.tree)) return null;

    return payload.tree ?? null;
  } catch {
    return null;
  }
}

export function saveStoredTree(tree: Tree): void {
  if (typeof window === "undefined") return;

  try {
    if (!tree) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: StoredPayload = {
      version: STORAGE_VERSION,
      tree,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage cheio ou indisponível: o app continua funcionando normalmente.
  }
}
