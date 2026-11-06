import { describe, expect, it } from "vitest";
import {
  addChildValue,
  buildTree,
  editNodeValue,
  findNodeById,
  inorderValues,
  insert,
  isValidTree,
  remove,
  search,
} from "@/lib/bst";

const VALUES = [50, 30, 70, 20, 40, 60, 80];

function sample() {
  const tree = buildTree(VALUES);
  if (!tree) throw new Error("Árvore de exemplo não construída");
  return tree;
}

describe("inserção", () => {
  it("insere a raiz em árvore vazia", () => {
    const result = insert(null, 10);
    expect(result.inserted).toBe(true);
    expect(result.side).toBe("root");
    expect(result.tree?.value).toBe(10);
    expect(result.tree?.left).toBeNull();
    expect(result.tree?.right).toBeNull();
  });

  it("constrói uma BST válida", () => {
    const tree = sample();
    expect(inorderValues(tree)).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(tree.value).toBe(50);
    expect(tree.left?.value).toBe(30);
    expect(tree.right?.value).toBe(70);
  });

  it("rejeita duplicados sem alterar a referência da árvore", () => {
    const tree = sample();
    const result = insert(tree, 40);
    expect(result.inserted).toBe(false);
    expect(result.side).toBeNull();
    expect(result.tree).toBe(tree);
    expect(inorderValues(result.tree)).toEqual([20, 30, 40, 50, 60, 70, 80]);
  });
});

describe("busca", () => {
  it("encontra um valor e devolve o caminho", () => {
    const tree = sample();
    const result = search(tree, 40);
    expect(result.found).toBe(true);
    expect(result.node?.value).toBe(40);
    expect(result.path.map((node) => node.value)).toEqual([50, 30, 40]);
  });

  it("não encontra e devolve o caminho percorrido", () => {
    const tree = sample();
    const result = search(tree, 45);
    expect(result.found).toBe(false);
    expect(result.path.map((node) => node.value)).toEqual([50, 30, 40]);
  });

  it("funciona em árvore vazia", () => {
    const result = search(null, 10);
    expect(result.found).toBe(false);
    expect(result.path).toHaveLength(0);
  });
});

describe("remoção", () => {
  it("remove folha", () => {
    const tree = sample();
    const result = remove(tree, 20);
    expect(result.removed).toBe(true);
    expect(result.case).toBe("leaf");
    expect(inorderValues(result.tree)).toEqual([30, 40, 50, 60, 70, 80]);
  });

  it("remove nó com um filho à esquerda", () => {
    const tree = buildTree([50, 30, 70, 60]);
    const result = remove(tree, 70);
    expect(result.case).toBe("one-child");
    expect(result.replacementId).toBe(tree?.right?.left?.id);
    expect(inorderValues(result.tree)).toEqual([30, 50, 60]);
  });

  it("remove nó com um filho à direita", () => {
    const tree = buildTree([50, 30, 70, 80]);
    const result = remove(tree, 70);
    expect(result.case).toBe("one-child");
    expect(result.replacementId).toBe(tree?.right?.right?.id);
    expect(inorderValues(result.tree)).toEqual([30, 50, 80]);
  });

  it("remove nó com dois filhos usando o sucessor em ordem", () => {
    const tree = sample();
    const targetId = tree.left?.id;
    const result = remove(tree, 30);
    expect(result.case).toBe("two-children");
    expect(result.successor?.value).toBe(40);
    expect(result.successorPath.map((node) => node.value)).toEqual([40]);
    expect(inorderValues(result.tree)).toEqual([20, 40, 50, 60, 70, 80]);
    expect(result.tree?.left?.value).toBe(40);
    expect(result.tree?.left?.id).toBe(targetId);
  });

  it("remove a raiz com dois filhos", () => {
    const tree = sample();
    const result = remove(tree, 50);
    expect(result.case).toBe("two-children");
    expect(result.tree?.value).toBe(60);
    expect(inorderValues(result.tree)).toEqual([20, 30, 40, 60, 70, 80]);
  });

  it("remove o único nó", () => {
    const tree = buildTree([10]);
    const result = remove(tree, 10);
    expect(result.case).toBe("leaf");
    expect(result.tree).toBeNull();
  });

  it("não altera a árvore quando o valor não existe", () => {
    const tree = sample();
    const result = remove(tree, 45);
    expect(result.removed).toBe(false);
    expect(result.tree).toBe(tree);
  });
});

describe("edição de valor (reconstrução da subárvore)", () => {
  it("reconstrói a subárvore preservando os IDs", () => {
    const tree = sample();
    const target = tree.left!;
    const leftChild = target.left!;
    const rightChild = target.right!;

    const result = editNodeValue(tree, target.id, 35);
    expect(result.error).toBeNull();
    expect(inorderValues(result.tree)).toEqual([20, 35, 40, 50, 60, 70, 80]);
    expect(result.tree?.left?.value).toBe(35);
    expect(result.tree?.left?.id).toBe(target.id);
    expect(result.tree?.left?.left?.id).toBe(leftChild.id);
    expect(result.tree?.left?.right?.id).toBe(rightChild.id);
  });

  it("rejeita valor fora dos limites dos ancestrais", () => {
    const tree = sample();
    const result = editNodeValue(tree, tree.left!.id, 55);
    expect(result.tree).toBe(tree);
    expect(result.error).toMatch(/intervalo permitido/);
  });

  it("rejeita valor duplicado", () => {
    const tree = sample();
    const result = editNodeValue(tree, tree.left!.id, 40);
    expect(result.tree).toBe(tree);
    expect(result.error).toMatch(/já existe/);
  });

  it("permite editar a raiz", () => {
    const tree = sample();
    const result = editNodeValue(tree, tree.id, 55);
    expect(result.error).toBeNull();
    expect(result.tree?.value).toBe(55);
    expect(result.tree?.id).toBe(tree.id);
    expect(inorderValues(result.tree)).toEqual([20, 30, 40, 55, 60, 70, 80]);
  });
});

describe("adição de filho", () => {
  it("adiciona filho respeitando os limites", () => {
    const tree = sample();
    const parent = tree.left!.left!; // 20
    const result = addChildValue(tree, parent.id, "right", 25);
    expect(result.error).toBeNull();
    expect(result.nodeId).not.toBeNull();
    expect(inorderValues(result.tree)).toEqual([20, 25, 30, 40, 50, 60, 70, 80]);
    expect(findNodeById(result.tree, result.nodeId)?.value).toBe(25);
  });

  it("rejeita valor fora dos limites do slot", () => {
    const tree = sample();
    const parent = tree.left!.left!; // 20
    const result = addChildValue(tree, parent.id, "right", 35);
    expect(result.tree).toBe(tree);
    expect(result.error).toMatch(/intervalo permitido/);
  });

  it("rejeita slot ocupado", () => {
    const tree = sample();
    const parent = tree.left!; // 30, com filho esquerdo 20
    const result = addChildValue(tree, parent.id, "left", 10);
    expect(result.tree).toBe(tree);
    expect(result.error).toMatch(/já tem um filho/);
  });

  it("rejeita duplicado", () => {
    const tree = sample();
    const result = addChildValue(tree, tree.left!.left!.id, "right", 40);
    expect(result.tree).toBe(tree);
    expect(result.error).toMatch(/já existe/);
  });
});

describe("validação estrutural", () => {
  it("aceita árvore vazia e árvore válida", () => {
    expect(isValidTree(null)).toBe(true);
    expect(isValidTree(sample())).toBe(true);
  });

  it("rejeita BST inválida", () => {
    const invalid = {
      id: "a",
      value: 10,
      left: { id: "b", value: 20, left: null, right: null },
      right: null,
    };
    expect(isValidTree(invalid)).toBe(false);
  });

  it("rejeita IDs duplicados e campos malformados", () => {
    const duplicateIds = {
      id: "a",
      value: 10,
      left: { id: "a", value: 5, left: null, right: null },
      right: null,
    };
    expect(isValidTree(duplicateIds)).toBe(false);
    expect(isValidTree({ id: "a", value: 10, left: null })).toBe(false);
    expect(isValidTree({ id: "a", value: 10.5, left: null, right: null })).toBe(
      false,
    );
  });
});
