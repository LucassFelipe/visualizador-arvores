import { afterEach, describe, expect, it } from "vitest";
import { buildTree } from "@/lib/bst";
import {
  STORAGE_KEY,
  STORAGE_KEY_LEGACY,
  STORAGE_VERSION,
} from "@/lib/constants";
import { loadStoredState, saveStoredState } from "@/lib/persistence";

interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type WindowHolder = { window?: { localStorage: FakeStorage } };

function installStorage(entries: Record<string, string> = {}): Map<string, string> {
  const map = new Map(Object.entries(entries));
  const storage: FakeStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
  (globalThis as unknown as WindowHolder).window = { localStorage: storage };
  return map;
}

function removeWindow(): void {
  delete (globalThis as unknown as WindowHolder).window;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

afterEach(() => {
  removeWindow();
});

describe("persistência", () => {
  it("retorna null sem janela (SSR)", () => {
    expect(loadStoredState()).toBeNull();
    expect(() =>
      saveStoredState("bst", { bst: null, avl: null }, { b: null, bstar: null, bplus: null }),
    ).not.toThrow();
  });

  it("migra o payload legado v1 para v2", () => {
    installStorage({
      [STORAGE_KEY_LEGACY]: JSON.stringify({ version: 1, tree: clone(buildTree([50, 30, 70])) }),
    });

    const state = loadStoredState();

    expect(state).not.toBeNull();
    expect(state!.kind).toBe("bst");
    expect(state!.binary.bst?.value).toBe(50);
    expect(state!.binary.bst?.left?.value).toBe(30);
    expect(state!.binary.avl).toBeNull();
    expect(state!.multiway).toEqual({ b: null, bstar: null, bplus: null });
  });

  it("prefere o payload v2 sobre o legado", () => {
    installStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: STORAGE_VERSION,
        kind: "avl",
        binary: { bst: null, avl: clone(buildTree([50, 30, 70])) },
        multiway: { b: null, bstar: null, bplus: null },
      }),
      [STORAGE_KEY_LEGACY]: JSON.stringify({ version: 1, tree: clone(buildTree([9])) }),
    });

    const state = loadStoredState();

    expect(state).not.toBeNull();
    expect(state!.kind).toBe("avl");
    expect(state!.binary.avl?.value).toBe(50);
    expect(state!.binary.bst).toBeNull();
  });

  it("salva e recarrega o estado completo", () => {
    const map = installStorage();

    saveStoredState(
      "bplus",
      { bst: clone(buildTree([50, 30, 70])), avl: null },
      { b: null, bstar: null, bplus: null },
    );

    expect(map.has(STORAGE_KEY)).toBe(true);

    const state = loadStoredState();
    expect(state).not.toBeNull();
    expect(state!.kind).toBe("bplus");
    expect(state!.binary.bst?.value).toBe(50);
    expect(state!.multiway.b).toBeNull();
  });

  it("descarta payloads corrompidos ou de versão errada", () => {
    installStorage({ [STORAGE_KEY]: "{isso não é json" });
    expect(loadStoredState()).toBeNull();

    installStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 99, kind: "bst", binary: {}, multiway: {} }),
    });
    expect(loadStoredState()).toBeNull();

    installStorage({
      [STORAGE_KEY]: JSON.stringify({ version: STORAGE_VERSION, kind: "xyz", binary: {}, multiway: {} }),
    });
    expect(loadStoredState()).toBeNull();

    installStorage({
      [STORAGE_KEY_LEGACY]: JSON.stringify({ version: 1, tree: { id: "a", value: 1 } }),
    });
    expect(loadStoredState()).toBeNull();
  });

  it("substitui árvores inválidas por null mantendo as válidas", () => {
    installStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: STORAGE_VERSION,
        kind: "bst",
        binary: {
          bst: clone(buildTree([50, 30, 70])),
          avl: { id: "x", value: 1 },
        },
        multiway: {
          b: { id: "y", keys: [3, 2, 1], children: "não é lista" },
          bstar: null,
          bplus: null,
        },
      }),
    });

    const state = loadStoredState();

    expect(state).not.toBeNull();
    expect(state!.binary.bst?.value).toBe(50);
    expect(state!.binary.avl).toBeNull();
    expect(state!.multiway.b).toBeNull();
  });
});
