import { isValidAvlTree } from "./avl";
import { isValidBTree } from "./btree";
import { isValidTree } from "./bst";
import {
  STORAGE_KEY,
  STORAGE_KEY_LEGACY,
  STORAGE_VERSION,
} from "./constants";
import type {
  BTree,
  BinaryKind,
  MultiwayKind,
  Tree,
  TreeKind,
} from "./types";

export interface StoredState {
  kind: TreeKind;
  binary: Record<BinaryKind, Tree>;
  multiway: Record<MultiwayKind, BTree>;
}

interface StoredPayloadV2 {
  version: number;
  kind: TreeKind;
  binary: Record<BinaryKind, Tree>;
  multiway: Record<MultiwayKind, BTree>;
}

interface StoredPayloadV1 {
  version: number;
  tree: Tree;
}

function isTreeKind(value: unknown): value is TreeKind {
  return (
    value === "bst" ||
    value === "avl" ||
    value === "b" ||
    value === "bstar" ||
    value === "bplus"
  );
}

function safeBinary(
  value: unknown,
  kind: BinaryKind,
  fallback: Tree,
): Tree {
  if (kind === "avl") return isValidAvlTree(value) ? value : fallback;
  return isValidTree(value) ? value : fallback;
}

function safeMultiway(
  value: unknown,
  kind: MultiwayKind,
  fallback: BTree,
): BTree {
  return isValidBTree(value, kind) ? value : fallback;
}

export function loadStoredState(): StoredState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;

      const payload = parsed as Partial<StoredPayloadV2>;
      if (payload.version !== STORAGE_VERSION || !isTreeKind(payload.kind)) {
        return null;
      }

      const binary = payload.binary as Partial<Record<BinaryKind, unknown>> | undefined;
      const multiway = payload.multiway as
        | Partial<Record<MultiwayKind, unknown>>
        | undefined;

      return {
        kind: payload.kind,
        binary: {
          bst: safeBinary(binary?.bst, "bst", null),
          avl: safeBinary(binary?.avl, "avl", null),
        },
        multiway: {
          b: safeMultiway(multiway?.b, "b", null),
          bstar: safeMultiway(multiway?.bstar, "bstar", null),
          bplus: safeMultiway(multiway?.bplus, "bplus", null),
        },
      };
    }

    const legacyRaw = window.localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!legacyRaw) return null;

    const legacy: unknown = JSON.parse(legacyRaw);
    if (typeof legacy !== "object" || legacy === null) return null;
    const payload = legacy as Partial<StoredPayloadV1>;
    if (payload.version !== 1 || !isValidTree(payload.tree)) return null;

    return {
      kind: "bst",
      binary: { bst: payload.tree ?? null, avl: null },
      multiway: { b: null, bstar: null, bplus: null },
    };
  } catch {
    return null;
  }
}

export function saveStoredState(
  kind: TreeKind,
  binary: Record<BinaryKind, Tree>,
  multiway: Record<MultiwayKind, BTree>,
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: StoredPayloadV2 = {
      version: STORAGE_VERSION,
      kind,
      binary,
      multiway,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage cheio ou indisponível: o app continua funcionando normalmente.
  }
}
