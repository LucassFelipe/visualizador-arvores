import { describe, expect, it } from "vitest";
import { buildTree, inorderValues, isValidTree } from "@/lib/bst";
import {
  insertOperation,
  removeOperation,
  searchOperation,
  traversalOperation,
} from "@/lib/operations";
import type { OperationResult } from "@/lib/types";

const VALUES = [50, 30, 70, 20, 40, 60, 80];

function sample() {
  const tree = buildTree(VALUES);
  if (!tree) throw new Error("Árvore de exemplo não construída");
  return tree;
}

function expectAllSnapshotsValid(result: OperationResult) {
  for (const step of result.steps) {
    expect(isValidTree(step.tree)).toBe(true);
    expect(step.message.length).toBeGreaterThan(0);
  }
}

describe("operação de inserção", () => {
  it("narra as comparações e termina com o novo nó", () => {
    const tree = sample();
    const result = insertOperation(tree, 35);

    expect(result.outcome).toBe("success");
    expect(result.steps).toHaveLength(4);
    expect(result.steps.slice(0, 3).every((step) => step.tree === tree)).toBe(
      true,
    );

    const last = result.steps[result.steps.length - 1];
    expect(last.kind).toBe("insert");
    expect(last.tree).toBe(result.finalTree);
    expect(last.activeIds).toHaveLength(1);
    expect(inorderValues(result.finalTree)).toEqual([
      20, 30, 35, 40, 50, 60, 70, 80,
    ]);
    expectAllSnapshotsValid(result);
  });

  it("rejeita duplicado", () => {
    const tree = sample();
    const result = insertOperation(tree, 40);

    expect(result.outcome).toBe("duplicate");
    expect(result.finalTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("duplicate");
    expect(result.steps[result.steps.length - 1].message).toMatch(/já existe/);
  });

  it("insere a raiz em árvore vazia", () => {
    const result = insertOperation(null, 10);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe("insert");
    expect(result.finalTree?.value).toBe(10);
  });
});

describe("operação de busca", () => {
  it("encontra o valor e destaca o caminho", () => {
    const tree = sample();
    const result = searchOperation(tree, 60);

    const last = result.steps[result.steps.length - 1];
    expect(result.outcome).toBe("success");
    expect(last.kind).toBe("found");
    expect(last.pathIds).toHaveLength(3);
    expect(last.activeIds).toHaveLength(1);
    expect(result.finalTree).toBe(tree);
    expectAllSnapshotsValid(result);
  });

  it("informa quando o valor não existe", () => {
    const tree = sample();
    const result = searchOperation(tree, 45);

    expect(result.outcome).toBe("not-found");
    expect(result.steps[result.steps.length - 1].kind).toBe("not-found");
    expect(result.steps[result.steps.length - 1].message).toMatch(/não está/);
  });

  it("funciona em árvore vazia", () => {
    const result = searchOperation(null, 10);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe("not-found");
  });
});

describe("operação de remoção", () => {
  it("remove folha", () => {
    const tree = sample();
    const result = removeOperation(tree, 20);

    expect(result.outcome).toBe("success");
    expect(result.steps[result.steps.length - 1].kind).toBe("remove");
    expect(inorderValues(result.finalTree)).toEqual([30, 40, 50, 60, 70, 80]);
    expectAllSnapshotsValid(result);
  });

  it("mostra o sucessor ao remover nó com dois filhos", () => {
    const tree = sample();
    const result = removeOperation(tree, 30);

    const successorStep = result.steps.find((step) => step.kind === "visit");
    expect(successorStep).toBeDefined();
    expect(successorStep?.activeIds).toHaveLength(2);
    expect(successorStep?.message).toMatch(/sucessor/);
    expect(result.steps[result.steps.length - 1].kind).toBe("remove");
    expect(inorderValues(result.finalTree)).toEqual([20, 40, 50, 60, 70, 80]);
    expectAllSnapshotsValid(result);
  });

  it("informa quando o valor não existe", () => {
    const tree = sample();
    const result = removeOperation(tree, 45);

    expect(result.outcome).toBe("not-found");
    expect(result.finalTree).toBe(tree);
    expect(result.steps[result.steps.length - 1].kind).toBe("not-found");
  });

  it("remove o único nó", () => {
    const result = removeOperation(buildTree([10]), 10);
    expect(result.finalTree).toBeNull();
    expect(result.steps[result.steps.length - 1].kind).toBe("remove");
    expectAllSnapshotsValid(result);
  });
});

describe("percursos", () => {
  const expected = {
    inorder: [20, 30, 40, 50, 60, 70, 80],
    preorder: [50, 30, 20, 40, 70, 60, 80],
    postorder: [20, 40, 30, 60, 80, 70, 50],
    level: [50, 30, 70, 20, 40, 60, 80],
  } as const;

  for (const [order, sequence] of Object.entries(expected) as Array<
    [keyof typeof expected, readonly number[]]
  >) {
    it(`percorre em ${order}`, () => {
      const tree = sample();
      const result = traversalOperation(tree, order);
      const last = result.steps[result.steps.length - 1];

      expect(result.steps).toHaveLength(VALUES.length + 1);
      expect(last.kind).toBe("done");
      expect(last.output).toEqual([...sequence]);
      expect(last.visitedIds).toHaveLength(VALUES.length);
      expect(last.message).toMatch(/concluído/);

      const visits = result.steps.filter((step) => step.kind === "visit");
      expect(visits[0].activeIds).toHaveLength(1);
      expect(visits[0].pathIds).toHaveLength(0);
      expectAllSnapshotsValid(result);
    });
  }

  it("lida com árvore vazia", () => {
    const result = traversalOperation(null, "inorder");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe("done");
    expect(result.steps[0].output).toEqual([]);
  });
});
