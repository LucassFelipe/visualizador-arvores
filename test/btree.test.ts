import { describe, expect, it } from "vitest";
import {
  buildBTree,
  countBKeys,
  countBNodes,
  countBValues,
  heightOfB,
  inorderBValues,
  insertB,
  isValidBTree,
  removeB,
  searchB,
} from "@/lib/btree";
import { BTREE_MAX_KEYS, BTREE_ORDER } from "@/lib/constants";
import type { BTree, MultiwayKind } from "@/lib/types";

const KINDS: MultiwayKind[] = ["b", "bstar", "bplus"];
const VALUES = Array.from({ length: 30 }, (_, index) => index + 1);

describe.each(KINDS)("árvore %s", (kind) => {
  it("mantém invariantes ao inserir 1..30", () => {
    let tree: BTree = null;

    for (const value of VALUES) {
      const result = insertB(tree, value, kind);
      expect(result.inserted).toBe(true);
      tree = result.tree;
      expect(isValidBTree(tree, kind)).toBe(true);
    }

    expect(countBValues(tree, kind)).toBe(30);
    expect(inorderBValues(tree, kind)).toEqual(VALUES);
    expect(heightOfB(tree)).toBeGreaterThanOrEqual(2);
    expect(heightOfB(tree)).toBeLessThanOrEqual(5);
    expect(countBNodes(tree)).toBeGreaterThan(1);
  });

  it("rejeita valor duplicado sem alterar a árvore", () => {
    const tree = buildBTree(VALUES, kind);
    const result = insertB(tree, 15, kind);

    expect(result.inserted).toBe(false);
    expect(result.tree).toBe(tree);
    expect(result.events).toHaveLength(0);
  });

  it("encontra valores presentes e ausentes", () => {
    const tree = buildBTree(VALUES, kind);

    for (const value of [1, 15, 30]) {
      const result = searchB(tree, value, kind);
      expect(result.found).toBe(true);
      expect(result.path.length).toBeGreaterThanOrEqual(1);
    }

    expect(searchB(tree, 0, kind).found).toBe(false);
    expect(searchB(tree, 31, kind).found).toBe(false);
    expect(searchB(null, 10, kind).found).toBe(false);
  });

  it("remove todos os valores em ordem crescente", () => {
    let tree = buildBTree(VALUES, kind);

    VALUES.forEach((value, index) => {
      const result = removeB(tree, value, kind);
      expect(result.removed).toBe(true);
      tree = result.tree;
      expect(isValidBTree(tree, kind)).toBe(true);
      expect(countBValues(tree, kind)).toBe(VALUES.length - index - 1);
    });

    expect(tree).toBeNull();
  });

  it("remove todos os valores em ordem decrescente", () => {
    let tree = buildBTree(VALUES, kind);

    [...VALUES].reverse().forEach((value, index) => {
      const result = removeB(tree, value, kind);
      expect(result.removed).toBe(true);
      tree = result.tree;
      expect(isValidBTree(tree, kind)).toBe(true);
      expect(countBValues(tree, kind)).toBe(VALUES.length - index - 1);
    });

    expect(tree).toBeNull();
  });

  it("ignora remoção de valor ausente", () => {
    const tree = buildBTree(VALUES, kind);
    const result = removeB(tree, 99, kind);

    expect(result.removed).toBe(false);
    expect(result.target).toBeNull();
    expect(result.tree).toBe(tree);
    expect(result.events).toHaveLength(0);
  });
});

describe("particularidades da B", () => {
  it("divide a raiz quando ela transborda", () => {
    const tree = buildBTree([1, 2, 3], "b");
    const result = insertB(tree, 4, "b");

    expect(result.baseOverflow).toBe(true);
    // O snapshot de base é transiente e excede o máximo por design.
    expect(result.baseTree?.keys).toHaveLength(BTREE_MAX_KEYS + 1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe("split");
    expect(result.events[0].message).toMatch(/raiz/);

    expect(result.tree?.keys).toEqual([3]);
    expect(result.tree?.children).toHaveLength(2);
    expect(isValidBTree(result.tree, "b")).toBe(true);
    expect(inorderBValues(result.tree, "b")).toEqual([1, 2, 3, 4]);
  });

  it("remove chave interna usando o predecessor", () => {
    const tree = buildBTree([1, 2, 3, 4, 5, 6], "b");
    const result = removeB(tree, 3, "b");

    expect(result.removed).toBe(true);
    expect(isValidBTree(result.tree, "b")).toBe(true);
    expect(inorderBValues(result.tree, "b")).toEqual([1, 2, 4, 5, 6]);
    expect(countBValues(result.tree, "b")).toBe(5);
  });

  it("pega emprestado do irmão esquerdo na subtração", () => {
    let tree = buildBTree([1, 2, 3, 4, 5, 6], "b");
    tree = removeB(tree, 6, "b").tree;
    tree = removeB(tree, 5, "b").tree;
    const result = removeB(tree, 4, "b");

    expect(result.events.some((event) => event.kind === "borrow")).toBe(true);
    expect(isValidBTree(result.tree, "b")).toBe(true);
    expect(inorderBValues(result.tree, "b")).toEqual([1, 2, 3]);
    expect(countBValues(result.tree, "b")).toBe(3);
  });

  it("mescla quando o irmão também está no mínimo", () => {
    let tree = buildBTree([1, 2, 3, 4, 5], "b");
    tree = removeB(tree, 2, "b").tree;
    tree = removeB(tree, 4, "b").tree;
    const result = removeB(tree, 5, "b");

    expect(result.events.some((event) => event.kind === "merge")).toBe(true);
    expect(result.tree?.keys).toEqual([1, 3]);
    expect(result.tree?.children).toHaveLength(0);
    expect(isValidBTree(result.tree, "b")).toBe(true);
    expect(inorderBValues(result.tree, "b")).toEqual([1, 3]);
  });
});

describe("particularidades da B*", () => {
  it("redistribui com o irmão antes de dividir", () => {
    const tree = buildBTree([1, 2, 3, 4, 5, 6], "bstar");
    const result = insertB(tree, 7, "bstar");

    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe("borrow");
    expect(result.events[0].message).toMatch(/redistribuída/);
    expect(result.tree?.keys).toEqual([4]);
    expect(result.tree?.children).toHaveLength(2);
    expect(isValidBTree(result.tree, "bstar")).toBe(true);
    expect(inorderBValues(result.tree, "bstar")).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("mantém a ocupação mínima mesmo com raiz de uma chave", () => {
    const tree = buildBTree(VALUES, "bstar");
    expect(isValidBTree(tree, "bstar")).toBe(true);
    expect(countBKeys(tree)).toBe(30);
  });
});

describe("particularidades da B+", () => {
  it("guarda todos os valores nas folhas e copia separadores", () => {
    const tree = buildBTree(VALUES, "bplus");

    expect(isValidBTree(tree, "bplus")).toBe(true);
    expect(inorderBValues(tree, "bplus")).toEqual(VALUES);
    expect(countBValues(tree, "bplus")).toBe(30);
    // Separadores são cópias: o total de chaves supera os valores.
    expect(countBKeys(tree)).toBeGreaterThan(countBValues(tree, "bplus"));
  });

  it("busca sempre desce até a folha", () => {
    const tree = buildBTree(VALUES, "bplus");

    for (const value of [1, 12, 30]) {
      const result = searchB(tree, value, "bplus");
      expect(result.found).toBe(true);
      expect(result.node?.children).toHaveLength(0);
    }
  });

  it("remove valor mantendo os separadores coerentes", () => {
    let tree = buildBTree(VALUES, "bplus");

    for (const value of [1, 15, 30, 7]) {
      const result = removeB(tree, value, "bplus");
      expect(result.removed).toBe(true);
      tree = result.tree;
      expect(isValidBTree(tree, "bplus")).toBe(true);
    }

    expect(countBValues(tree, "bplus")).toBe(26);
    expect(inorderBValues(tree, "bplus")).toEqual(
      VALUES.filter((value) => ![1, 15, 30, 7].includes(value)),
    );
  });
});

describe("utilitários multi-chave", () => {
  it("conta nós, chaves e valores corretamente", () => {
    const tree = buildBTree([1, 2, 3, 4, 5, 6], "b");

    expect(countBNodes(tree)).toBe(3);
    expect(countBKeys(tree)).toBe(6);
    expect(countBValues(tree, "b")).toBe(6);
    expect(countBNodes(null)).toBe(0);
    expect(countBKeys(null)).toBe(0);
    expect(countBValues(null, "b")).toBe(0);
    expect(heightOfB(null)).toBe(0);
  });

  it("respeita a ordem configurada", () => {
    const tree = buildBTree(VALUES, "b");
    expect(BTREE_ORDER).toBe(4);
    expect(BTREE_MAX_KEYS).toBe(3);

    const walk = (node: BTree): void => {
      if (!node) return;
      expect(node.keys.length).toBeLessThanOrEqual(BTREE_MAX_KEYS);
      expect(node.children.length).toBeLessThanOrEqual(BTREE_ORDER);
      for (const child of node.children) walk(child);
    };
    walk(tree);
  });
});
