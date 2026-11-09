import { describe, expect, it } from "vitest";
import { buildAvlTree, isValidAvlTree } from "@/lib/avl";
import { buildTree } from "@/lib/bst";
import { buildBTree, collectBLeaves, countBNodes, findBNodeById, inorderBValues, isLeaf, isValidBTree } from "@/lib/btree";
import { BTREE_MAX_KEYS, BTREE_ORDER, traversalLabels } from "@/lib/constants";
import { layoutBTree } from "@/lib/layout";
import { computeBTreeMetrics } from "@/lib/metrics";
import {
  bInsertOperation,
  bRemoveOperation,
  bSearchOperation,
  bTraversalOperation,
  insertForKind,
  removeForKind,
  searchForKind,
  traversalForKind,
} from "@/lib/operations";
import { traverseB } from "@/lib/traversals";
import type { MultiwayKind, OperationResult } from "@/lib/types";

const KINDS: MultiwayKind[] = ["b", "bstar", "bplus"];
const VALUES = Array.from({ length: 30 }, (_, index) => index + 1);

function expectMultiwaySnapshots(result: OperationResult): void {
  for (const step of result.steps) {
    expect(step.tree).toBeNull();
    expect(step.btree).not.toBeNull();
    expect(step.message.length).toBeGreaterThan(0);
  }
}

describe.each(KINDS)("métricas da %s", (kind) => {
  it("calcula métricas de uma árvore com 30 valores", () => {
    const tree = buildBTree(VALUES, kind);
    const metrics = computeBTreeMetrics(tree, kind);

    expect(metrics.valid).toBe(true);
    expect(metrics.balanced).toBe(true);
    expect(metrics.order).toBe(BTREE_ORDER);
    expect(metrics.values).toBe(30);
    expect(metrics.min).toBe(1);
    expect(metrics.max).toBe(30);
    expect(metrics.root).not.toBeNull();
    expect(metrics.height).toBeGreaterThanOrEqual(2);
    expect(metrics.nodes).toBeGreaterThan(1);
    expect(metrics.leaves).toBeGreaterThanOrEqual(2);
    expect(metrics.internal).toBeGreaterThanOrEqual(1);
    expect(metrics.maxKeys).toBeLessThanOrEqual(BTREE_MAX_KEYS);
    expect(metrics.minKeys).toBeGreaterThanOrEqual(1);
    expect(metrics.avgDepth).toBeGreaterThan(0);

    if (kind === "bplus") {
      // Folhas guardam os valores; separadores só aumentam a contagem de chaves.
      expect(metrics.keys).toBeGreaterThan(metrics.values);
    } else {
      expect(metrics.keys).toBe(30);
      expect(metrics.values).toBe(metrics.keys);
    }
  });

  it("zera as métricas em árvore vazia", () => {
    const metrics = computeBTreeMetrics(null, kind);

    expect(metrics.nodes).toBe(0);
    expect(metrics.values).toBe(0);
    expect(metrics.keys).toBe(0);
    expect(metrics.height).toBe(0);
    expect(metrics.min).toBeNull();
    expect(metrics.max).toBeNull();
    expect(metrics.root).toBeNull();
    expect(metrics.avgDepth).toBe(0);
    expect(metrics.valid).toBe(true);
  });
});

describe("layout multi-chave", () => {
  it("posiciona todos os nós sem sobreposição no mesmo nível", () => {
    const tree = buildBTree(VALUES, "b");
    const layout = layoutBTree(tree, "b");

    expect(layout.nodes).toHaveLength(countBNodes(tree));
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);

    const byDepth = new Map<number, Array<{ x: number; width: number }>>();
    for (const node of layout.nodes) {
      const group = byDepth.get(node.depth) ?? [];
      group.push({ x: node.x, width: node.width });
      byDepth.set(node.depth, group);
    }

    for (const group of byDepth.values()) {
      const sorted = [...group].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i += 1) {
        const previous = sorted[i - 1];
        const current = sorted[i];
        expect(current.x - current.width / 2).toBeGreaterThanOrEqual(
          previous.x + previous.width / 2,
        );
      }
    }
  });

  it("conecta cada nó ao pai e respeita a profundidade", () => {
    const tree = buildBTree(VALUES, "bstar");
    const layout = layoutBTree(tree, "bstar");
    const ids = new Set(layout.nodes.map((node) => node.id));

    const treeEdges = layout.edges.filter((edge) => edge.variant === "tree");
    expect(treeEdges).toHaveLength(countBNodes(tree) - 1);
    for (const edge of treeEdges) {
      expect(ids.has(edge.parentId)).toBe(true);
      expect(ids.has(edge.childId)).toBe(true);
      expect(edge.length).toBeGreaterThan(0);
    }
  });

  it("cria elos encadeados entre as folhas do B+", () => {
    const tree = buildBTree(VALUES, "bplus");
    const layout = layoutBTree(tree, "bplus");
    const leaves = layout.nodes.filter((node) => node.leaf);
    const leafLinks = layout.edges.filter((edge) => edge.variant === "leaf-link");

    expect(leaves).toHaveLength(collectBLeaves(tree).length);
    expect(leafLinks).toHaveLength(leaves.length - 1);
    expect(leafLinks.every((edge) => edge.angle === 0)).toBe(true);
  });

  it("não cria elos de folha fora do B+", () => {
    const tree = buildBTree(VALUES, "b");
    const layout = layoutBTree(tree, "b");

    expect(layout.edges.filter((edge) => edge.variant === "leaf-link")).toHaveLength(0);
    expect(layout.edges.filter((edge) => edge.variant === "tree")).toHaveLength(
      countBNodes(tree) - 1,
    );
  });

  it("retorna layout vazio para árvore nula", () => {
    const layout = layoutBTree(null, "b");
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
    expect(layout.width).toBe(0);
    expect(layout.height).toBe(0);
  });
});

describe("percursos multi-chave", () => {
  it("percorre em ordem, pré-ordem, pós-ordem e em nível", () => {
    const tree = buildBTree(VALUES, "b");

    for (const order of ["inorder", "preorder", "postorder", "level"] as const) {
      const visits = traverseB(tree, order, "b");
      expect(visits).toHaveLength(30);
      const sorted = [...visits.map((visit) => visit.value)].sort((a, b) => a - b);
      expect(sorted).toEqual(VALUES);
    }

    expect(traverseB(tree, "inorder", "b").map((visit) => visit.value)).toEqual(VALUES);
  });

  it("o em ordem do B+ anda pelas folhas", () => {
    const tree = buildBTree(VALUES, "bplus");
    const visits = traverseB(tree, "inorder", "bplus");

    expect(visits.map((visit) => visit.value)).toEqual(VALUES);
    for (const visit of visits) {
      const owner = findBNodeById(tree, visit.id);
      expect(owner).not.toBeNull();
      expect(isLeaf(owner!)).toBe(true);
    }
  });

  it("rótulos do B+ diferenciam o percurso de folhas", () => {
    expect(traversalLabels("bplus").inorder).toBe("Folhas");
    expect(traversalLabels("b").inorder).toBe("Em ordem");
  });
});

describe("operações multi-chave", () => {
  it("insere na raiz vazia", () => {
    const result = bInsertOperation(null, 10, "b");

    expect(result.model).toBe("multiway");
    expect(result.treeKind).toBe("b");
    expect(result.outcome).toBe("success");
    expect(result.finalTree).toBeNull();
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe("insert");
    expect(result.finalBTree?.keys).toEqual([10]);
    expectMultiwaySnapshots(result);
  });

  it("narra comparações, inserção e divisão", () => {
    const tree = buildBTree([1, 2, 3], "b");
    const result = bInsertOperation(tree, 4, "b");
    const kinds = result.steps.map((step) => step.kind);

    expect(kinds[0]).toBe("compare");
    expect(kinds).toContain("insert");
    expect(kinds).toContain("split");
    expect(kinds[kinds.length - 1]).toBe("done");

    expect(result.finalBTree?.keys).toEqual([3]);
    expect(inorderBValues(result.finalBTree, "b")).toEqual([1, 2, 3, 4]);
    expect(isValidBTree(result.finalBTree, "b")).toBe(true);
    expect(result.steps[result.steps.length - 1].btree).toBe(result.finalBTree);
    expectMultiwaySnapshots(result);
  });

  it("rejeita duplicado", () => {
    const tree = buildBTree([1, 2, 3], "b");
    const result = bInsertOperation(tree, 2, "b");

    expect(result.outcome).toBe("duplicate");
    expect(result.finalBTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("duplicate");
    expect(result.steps[result.steps.length - 1].message).toMatch(/já existe/);
  });

  it("busca com e sem sucesso", () => {
    const tree = buildBTree(VALUES, "b");

    const found = bSearchOperation(tree, 17, "b");
    expect(found.outcome).toBe("success");
    expect(found.steps[found.steps.length - 1].kind).toBe("found");
    expect(found.finalBTree).toBe(tree);
    expectMultiwaySnapshots(found);

    const missing = bSearchOperation(tree, 99, "b");
    expect(missing.outcome).toBe("not-found");
    expect(missing.steps[missing.steps.length - 1].kind).toBe("not-found");
    expect(missing.finalBTree).toBe(tree);
  });

  it("remoção com empréstimo gera passo de borrow", () => {
    let tree = buildBTree([1, 2, 3, 4, 5, 6], "b");
    tree = bRemoveOperation(tree, 6, "b").finalBTree!;
    tree = bRemoveOperation(tree, 5, "b").finalBTree!;
    const result = bRemoveOperation(tree, 4, "b");

    expect(result.outcome).toBe("success");
    expect(result.steps.map((step) => step.kind)).toContain("borrow");
    expect(result.steps[result.steps.length - 1].kind).toBe("remove");
    expect(inorderBValues(result.finalBTree, "b")).toEqual([1, 2, 3]);
    expect(isValidBTree(result.finalBTree, "b")).toBe(true);
    expectMultiwaySnapshots(result);
  });

  it("remoção informa quando o valor não existe", () => {
    const tree = buildBTree(VALUES, "b");
    const result = bRemoveOperation(tree, 99, "b");

    expect(result.outcome).toBe("not-found");
    expect(result.finalBTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("not-found");
  });

  it("percurso do B+ usa o rótulo Folhas", () => {
    const tree = buildBTree(VALUES, "bplus");
    const result = bTraversalOperation(tree, "inorder", "bplus");
    const last = result.steps[result.steps.length - 1];

    expect(result.title).toContain("Folhas");
    expect(result.steps.filter((step) => step.kind === "visit")).toHaveLength(30);
    expect(last.kind).toBe("done");
    expect(last.output).toEqual(VALUES);
    expect(last.message).toMatch(/concluído/);
    expectMultiwaySnapshots(result);
  });

  it("percurso em árvore vazia", () => {
    const result = bTraversalOperation(null, "inorder", "b");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe("done");
    expect(result.steps[0].output).toEqual([]);
    expect(result.steps[0].message).toMatch(/vazia/);
  });
});

describe("despacho por tipo", () => {
  it("roteia cada estrutura para o modelo certo", () => {
    const binary = buildAvlTree([50, 30, 70]);
    const multi = buildBTree([1, 2, 3], "b");
    const bplus = buildBTree(VALUES, "bplus");

    const avlInsert = insertForKind("avl", binary, null, 40);
    expect(avlInsert.model).toBe("binary");
    expect(avlInsert.treeKind).toBe("avl");
    expect(isValidAvlTree(avlInsert.finalTree)).toBe(true);

    const avlSearch = searchForKind("avl", binary, null, 30);
    expect(avlSearch.model).toBe("binary");
    expect(avlSearch.treeKind).toBe("avl");
    expect(avlSearch.outcome).toBe("success");

    const bstSearch = searchForKind("bst", buildTree([50, 30, 70]), null, 30);
    expect(bstSearch.model).toBe("binary");
    expect(bstSearch.treeKind).toBe("bst");

    const bInsert = insertForKind("b", null, multi, 4);
    expect(bInsert.model).toBe("multiway");
    expect(bInsert.treeKind).toBe("b");
    expect(isValidBTree(bInsert.finalBTree, "b")).toBe(true);

    const bRemove = removeForKind("b", null, multi, 2);
    expect(bRemove.model).toBe("multiway");
    expect(bRemove.treeKind).toBe("b");
    expect(bRemove.outcome).toBe("success");
    expect(inorderBValues(bRemove.finalBTree, "b")).toEqual([1, 3]);

    const bplusTraversal = traversalForKind("bplus", null, bplus, "inorder");
    expect(bplusTraversal.model).toBe("multiway");
    expect(bplusTraversal.treeKind).toBe("bplus");
    expect(bplusTraversal.title).toContain("Folhas");
    expect(bplusTraversal.steps[bplusTraversal.steps.length - 1].output).toEqual(VALUES);
  });

  it("inserção B* pelo despacho mantém a validação", () => {
    const tree = buildBTree([1, 2, 3, 4, 5, 6], "bstar");
    const result = insertForKind("bstar", null, tree, 7);

    expect(result.model).toBe("multiway");
    expect(result.treeKind).toBe("bstar");
    expect(isValidBTree(result.finalBTree, "bstar")).toBe(true);
    expect(inorderBValues(result.finalBTree, "bstar")).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
