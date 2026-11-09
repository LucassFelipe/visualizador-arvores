import { describe, expect, it } from "vitest";
import {
  addAvlChildValue,
  buildAvlTree,
  editAvlNodeValue,
  insertAvl,
  isValidAvlTree,
  rebalanceWhole,
  removeAvl,
} from "@/lib/avl";
import {
  buildTree,
  findNodeByValue,
  heightOf,
  inorderValues,
  isValidTree,
} from "@/lib/bst";
import {
  avlInsertOperation,
  avlRemoveOperation,
  avlSearchOperation,
} from "@/lib/operations";
import type { OperationResult, Tree } from "@/lib/types";

function expectValidSnapshots(result: OperationResult): void {
  for (const step of result.steps) {
    expect(isValidTree(step.tree)).toBe(true);
    expect(step.message.length).toBeGreaterThan(0);
  }
}

describe("inserção AVL", () => {
  it("LL: rotação simples à direita", () => {
    let tree: Tree = null;
    tree = insertAvl(tree, 30).tree;
    tree = insertAvl(tree, 20).tree;
    const result = insertAvl(tree, 10);

    expect(result.inserted).toBe(true);
    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].kind).toBe("LL");
    expect(result.rotations[0].pivotValue).toBe(30);
    expect(result.rotations[0].pivotId).toBe(tree!.id);

    expect(result.tree?.value).toBe(20);
    expect(result.tree?.left?.value).toBe(10);
    expect(result.tree?.right?.value).toBe(30);
    expect(isValidAvlTree(result.tree)).toBe(true);

    // baseTree guarda a árvore antes da rotação (ainda desbalanceada).
    expect(result.baseTree?.value).toBe(30);
    expect(result.baseTree?.left?.left?.value).toBe(10);
    expect(result.rotations[0].subtree).toEqual(result.tree);
  });

  it("RR: rotação simples à esquerda", () => {
    let tree: Tree = null;
    tree = insertAvl(tree, 10).tree;
    tree = insertAvl(tree, 20).tree;
    const result = insertAvl(tree, 30);

    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].kind).toBe("RR");
    expect(result.rotations[0].pivotValue).toBe(10);
    expect(result.tree?.value).toBe(20);
    expect(result.tree?.left?.value).toBe(10);
    expect(result.tree?.right?.value).toBe(30);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("LR: rotação dupla esquerda-direita", () => {
    let tree: Tree = null;
    tree = insertAvl(tree, 30).tree;
    tree = insertAvl(tree, 10).tree;
    const result = insertAvl(tree, 20);

    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].kind).toBe("LR");
    expect(result.tree?.value).toBe(20);
    expect(result.tree?.left?.value).toBe(10);
    expect(result.tree?.right?.value).toBe(30);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("RL: rotação dupla direita-esquerda", () => {
    let tree: Tree = null;
    tree = insertAvl(tree, 10).tree;
    tree = insertAvl(tree, 30).tree;
    const result = insertAvl(tree, 20);

    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].kind).toBe("RL");
    expect(result.tree?.value).toBe(20);
    expect(result.tree?.left?.value).toBe(10);
    expect(result.tree?.right?.value).toBe(30);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("não rotaciona quando a árvore já está equilibrada", () => {
    let tree: Tree = null;
    for (const value of [50, 30, 70]) {
      const result = insertAvl(tree, value);
      expect(result.rotations).toHaveLength(0);
      tree = result.tree;
    }
    expect(isValidAvlTree(tree)).toBe(true);
    expect(inorderValues(tree)).toEqual([30, 50, 70]);
  });

  it("ignora valor duplicado sem alterar a árvore", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const result = insertAvl(tree, 30);

    expect(result.inserted).toBe(false);
    expect(result.nodeId).toBeNull();
    expect(result.rotations).toHaveLength(0);
    expect(result.tree).toBe(tree);
  });

  it("mantém o balanceamento ao inserir 1..25 em ordem", () => {
    const values = Array.from({ length: 25 }, (_, index) => index + 1);
    const tree = buildAvlTree(values);

    expect(isValidAvlTree(tree)).toBe(true);
    expect(inorderValues(tree)).toEqual(values);
    // AVL com 25 nós não pode passar de altura 6 (N(6) = 20, N(7) = 33).
    expect(heightOf(tree)).toBeLessThanOrEqual(6);
  });
});

describe("remoção AVL", () => {
  it("remove folha", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const result = removeAvl(tree, 70);

    expect(result.removed).toBe(true);
    expect(result.case).toBe("leaf");
    expect(result.successorValue).toBeNull();
    expect(result.rotations).toHaveLength(0);
    expect(inorderValues(result.tree)).toEqual([30, 50]);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("remove nó com um filho", () => {
    const tree = buildAvlTree([50, 30, 70, 60]);
    const result = removeAvl(tree, 70);

    expect(result.removed).toBe(true);
    expect(result.case).toBe("one-child");
    expect(result.tree?.right?.value).toBe(60);
    expect(inorderValues(result.tree)).toEqual([30, 50, 60]);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("remove nó com dois filhos usando o sucessor", () => {
    const tree = buildAvlTree([50, 30, 70, 60, 80]);
    const result = removeAvl(tree, 70);

    expect(result.removed).toBe(true);
    expect(result.case).toBe("two-children");
    expect(result.successorValue).toBe(80);
    expect(result.tree?.right?.value).toBe(80);
    expect(inorderValues(result.tree)).toEqual([30, 50, 60, 80]);
    expect(isValidAvlTree(result.tree)).toBe(true);
  });

  it("rotaciona ao remover para reequilibrar", () => {
    const tree = buildAvlTree([20, 10, 30, 5, 15]);
    const result = removeAvl(tree, 30);

    expect(result.removed).toBe(true);
    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].kind).toBe("LL");
    expect(result.tree?.value).toBe(10);
    expect(result.tree?.left?.value).toBe(5);
    expect(result.tree?.right?.value).toBe(20);
    expect(result.tree?.right?.left?.value).toBe(15);
    expect(isValidAvlTree(result.tree)).toBe(true);
    expect(inorderValues(result.tree)).toEqual([5, 10, 15, 20]);
  });

  it("remove todos os valores mantendo o invariante", () => {
    const values = [40, 20, 60, 10, 30, 50, 70, 5, 15, 25, 35, 45, 55, 65, 75];
    let tree = buildAvlTree(values);
    let remaining = [...values].sort((a, b) => a - b);

    for (const value of [...values].reverse()) {
      const result = removeAvl(tree, value);
      expect(result.removed).toBe(true);
      tree = result.tree;
      remaining = remaining.filter((item) => item !== value);
      expect(isValidAvlTree(tree)).toBe(true);
      expect(inorderValues(tree)).toEqual(remaining);
    }

    expect(tree).toBeNull();
  });

  it("ignora valor ausente", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const result = removeAvl(tree, 99);

    expect(result.removed).toBe(false);
    expect(result.target).toBeNull();
    expect(result.case).toBeNull();
    expect(result.tree).toBe(tree);
  });
});

describe("editor livre AVL", () => {
  it("rebalanceia uma árvore degenerada", () => {
    const skewed = buildTree([1, 2, 3, 4, 5]);
    const balanced = rebalanceWhole(skewed);

    expect(isValidAvlTree(balanced)).toBe(true);
    expect(inorderValues(balanced)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rebalanceia mantendo a ordem dos valores", () => {
    const skewed = buildTree([50, 40, 30, 20, 70]);
    const balanced = rebalanceWhole(skewed);

    expect(isValidAvlTree(balanced)).toBe(true);
    expect(inorderValues(balanced)).toEqual(inorderValues(skewed));
  });

  it("edita um valor dentro do intervalo permitido", () => {
    const tree = buildAvlTree([50, 30, 70, 20, 40]);
    const node = findNodeByValue(tree, 20)!;
    const result = editAvlNodeValue(tree, node.id, 25);

    expect(result.error).toBeNull();
    expect(result.nodeId).toBe(node.id);
    expect(isValidAvlTree(result.tree)).toBe(true);
    expect(inorderValues(result.tree)).toEqual([25, 30, 40, 50, 70]);
  });

  it("recusa edição fora do intervalo ou duplicada", () => {
    const tree = buildAvlTree([50, 30, 70, 20, 40]);
    const node = findNodeByValue(tree, 20)!;

    const outOfRange = editAvlNodeValue(tree, node.id, 60);
    expect(outOfRange.error).not.toBeNull();
    expect(outOfRange.tree).toBe(tree);

    const duplicate = editAvlNodeValue(tree, node.id, 40);
    expect(duplicate.error).not.toBeNull();
    expect(duplicate.tree).toBe(tree);
  });

  it("adiciona filho no lado pedido e rebalanceia", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const root = tree!;
    const leftChild = findNodeByValue(tree, 30)!;

    const result = addAvlChildValue(tree, leftChild.id, "left", 25);

    expect(result.error).toBeNull();
    expect(result.nodeId).not.toBeNull();
    expect(isValidAvlTree(result.tree)).toBe(true);
    expect(result.tree?.left?.left?.value).toBe(25);
    expect(inorderValues(result.tree)).toEqual([25, 30, 50, 70]);

    const outOfRange = addAvlChildValue(tree, leftChild.id, "left", 60);
    expect(outOfRange.error).not.toBeNull();
    expect(outOfRange.tree).toBe(tree);

    const occupied = addAvlChildValue(tree, root.id, "left", 45);
    expect(occupied.error).toMatch(/já tem um filho/);
    expect(occupied.tree).toBe(tree);
  });
});

describe("validação AVL", () => {
  it("aceita árvore balanceada e rejeita degenerada", () => {
    expect(isValidAvlTree(buildAvlTree([50, 30, 70, 20, 40, 60, 80]))).toBe(true);
    expect(isValidAvlTree(buildTree([10, 20, 30]))).toBe(false);
    expect(isValidAvlTree(null)).toBe(true);
  });
});

describe("operações AVL", () => {
  it("inserção com rotação narra o passo a passo", () => {
    const tree = buildAvlTree([30, 20]);
    const result = avlInsertOperation(tree, 10);
    const kinds = result.steps.map((step) => step.kind);

    expect(result.model).toBe("binary");
    expect(result.treeKind).toBe("avl");
    expect(result.outcome).toBe("success");
    expect(kinds).toEqual(["compare", "compare", "insert", "rotate", "done"]);

    const insertStep = result.steps.find((step) => step.kind === "insert")!;
    expect(insertStep.tree?.value).toBe(30);
    expect(insertStep.tree?.left?.left?.value).toBe(10);

    const rotateStep = result.steps.find((step) => step.kind === "rotate")!;
    expect(rotateStep.message).toMatch(/Rotação/);
    expect(rotateStep.message).toMatch(/LL/);
    expect(rotateStep.tree?.value).toBe(20);

    const last = result.steps[result.steps.length - 1];
    expect(last.tree).toBe(result.finalTree);
    expect(last.message).toMatch(/rotação/);
    expect(result.finalTree?.value).toBe(20);
    expect(inorderValues(result.finalTree)).toEqual([10, 20, 30]);
    expect(isValidAvlTree(result.finalTree)).toBe(true);
    expectValidSnapshots(result);
  });

  it("inserção sem rotação termina direto no insert", () => {
    const tree = buildAvlTree([50, 30]);
    const result = avlInsertOperation(tree, 70);
    const kinds = result.steps.map((step) => step.kind);

    expect(kinds).toEqual(["compare", "insert"]);
    expect(inorderValues(result.finalTree)).toEqual([30, 50, 70]);
    expectValidSnapshots(result);
  });

  it("inserção rejeita duplicado", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const result = avlInsertOperation(tree, 30);

    expect(result.outcome).toBe("duplicate");
    expect(result.finalTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("duplicate");
    expect(result.steps[result.steps.length - 1].message).toMatch(/já existe/);
  });

  it("remoção dispara rotação para reequilibrar", () => {
    const tree = buildAvlTree([20, 10, 30, 5, 15]);
    const result = avlRemoveOperation(tree, 30);
    const kinds = result.steps.map((step) => step.kind);

    expect(result.outcome).toBe("success");
    expect(kinds).toContain("remove");
    expect(kinds).toContain("rotate");
    expect(kinds[kinds.length - 1]).toBe("done");
    expect(result.finalTree?.value).toBe(10);
    expect(inorderValues(result.finalTree)).toEqual([5, 10, 15, 20]);
    expect(isValidAvlTree(result.finalTree)).toBe(true);
    expectValidSnapshots(result);
  });

  it("remoção informa quando o valor não existe", () => {
    const tree = buildAvlTree([50, 30, 70]);
    const result = avlRemoveOperation(tree, 99);

    expect(result.outcome).toBe("not-found");
    expect(result.finalTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("not-found");
    expectValidSnapshots(result);
  });

  it("busca encontra e reporta o caminho", () => {
    const tree = buildAvlTree([50, 30, 70, 20, 40]);
    const found = avlSearchOperation(tree, 40);

    expect(found.treeKind).toBe("avl");
    expect(found.outcome).toBe("success");
    expect(found.steps[found.steps.length - 1].kind).toBe("found");
    expect(found.finalTree).toBe(tree);

    const missing = avlSearchOperation(tree, 45);
    expect(missing.outcome).toBe("not-found");
    expect(missing.steps[missing.steps.length - 1].kind).toBe("not-found");
  });
});
