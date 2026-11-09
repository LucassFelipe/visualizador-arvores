import { insertAvl, removeAvl } from "./avl";
import { insertB, isLeaf, lowerBound, removeB, searchB, upperBound } from "./btree";
import {
  findNodeById,
  insert,
  remove,
  replaceSubtree,
  search,
} from "./bst";
import { traversalLabels } from "./constants";
import { traverse, traverseB } from "./traversals";
import type {
  BNode,
  BTree,
  MultiwayKind,
  NodeId,
  OperationResult,
  Step,
  TraversalOrder,
  Tree,
  TreeNode,
  TreeKind,
} from "./types";

type StepInput = Pick<Step, "tree" | "kind" | "message"> & Partial<Step>;

function makeStep(input: StepInput): Step {
  return {
    btree: null,
    activeIds: [],
    pathIds: [],
    visitedIds: [],
    output: [],
    ...input,
  };
}

function binaryResult(
  steps: Step[],
  finalTree: Tree,
  outcome: OperationResult["outcome"],
  title: string,
  treeKind: "bst" | "avl" = "bst",
): OperationResult {
  return {
    model: "binary",
    treeKind,
    steps,
    finalTree,
    finalBTree: null,
    outcome,
    title,
  };
}

export function insertOperation(tree: Tree, value: number): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];

  let current = tree;
  let parent: TreeNode | null = null;
  let side: "left" | "right" | "root" = "root";

  while (current) {
    path.push(current.id);

    if (value === current.value) {
      steps.push(
        makeStep({
          tree,
          kind: "duplicate",
          activeIds: [current.id],
          pathIds: [...path],
          compare: "equal",
          message: `${value} já existe na árvore. A inserção foi ignorada.`,
        }),
      );
      return binaryResult(
        steps,
        tree,
        "duplicate",
        `Inserir ${value}`,
      );
    }

    const direction: "left" | "right" = value < current.value ? "left" : "right";
    steps.push(
      makeStep({
        tree,
        kind: "compare",
        activeIds: [current.id],
        pathIds: [...path],
        compare: direction,
        message: `${value} ${direction === "left" ? "<" : ">"} ${current.value}: desço para a ${direction === "left" ? "esquerda" : "direita"}.`,
      }),
    );

    parent = current;
    side = direction;
    current = direction === "left" ? current.left : current.right;
  }

  const result = insert(tree, value);
  const newId = result.nodeId!;

  const message =
    side === "root"
      ? `${value} é a raiz da árvore.`
      : `${value} inserido como filho ${side === "left" ? "esquerdo" : "direito"} de ${parent!.value}.`;

  steps.push(
    makeStep({
      tree: result.tree,
      kind: "insert",
      activeIds: [newId],
      pathIds: [...path, newId],
      visitedIds: [...path, newId],
      message,
    }),
  );

  return binaryResult(
    steps,
    result.tree,
    "success",
    `Inserir ${value}`,
  );
}

export function searchOperation(
  tree: Tree,
  value: number,
  treeKind: "bst" | "avl" = "bst",
): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];

  let current = tree;
  while (current) {
    path.push(current.id);

    if (value === current.value) {
      steps.push(
        makeStep({
          tree,
          kind: "found",
          activeIds: [current.id],
          pathIds: [...path],
          visitedIds: [...path],
          compare: "equal",
          message: `${value} encontrado!`,
        }),
      );
      return binaryResult(
        steps,
        tree,
        "success",
        `Buscar ${value}`,
        treeKind,
      );
    }

    const direction: "left" | "right" = value < current.value ? "left" : "right";
    steps.push(
      makeStep({
        tree,
        kind: "compare",
        activeIds: [current.id],
        pathIds: [...path],
        compare: direction,
        message: `${value} ${direction === "left" ? "<" : ">"} ${current.value}: continuo à ${direction === "left" ? "esquerda" : "direita"}.`,
      }),
    );

    current = direction === "left" ? current.left : current.right;
  }

  steps.push(
    makeStep({
      tree,
      kind: "not-found",
      pathIds: [...path],
      visitedIds: [...path],
      message: `${value} não está na árvore.`,
    }),
  );

  return binaryResult(
    steps,
    tree,
    "not-found",
    `Buscar ${value}`,
    treeKind,
  );
}

export function removeOperation(tree: Tree, value: number): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];

  const found = search(tree, value);
  for (const node of found.path) {
    path.push(node.id);
    const direction: "left" | "right" | "equal" =
      value === node.value ? "equal" : value < node.value ? "left" : "right";

    if (direction === "equal") break;

    steps.push(
      makeStep({
        tree,
        kind: "compare",
        activeIds: [node.id],
        pathIds: [...path],
        compare: direction,
        message: `${value} ${direction === "left" ? "<" : ">"} ${node.value}: desço para a ${direction === "left" ? "esquerda" : "direita"}.`,
      }),
    );
  }

  if (!found.found) {
    steps.push(
      makeStep({
        tree,
        kind: "not-found",
        pathIds: [...path],
        visitedIds: [...path],
        message: `${value} não está na árvore. Nada para remover.`,
      }),
    );
    return binaryResult(
      steps,
      tree,
      "not-found",
      `Remover ${value}`,
    );
  }

  const result = remove(tree, value);
  const target = found.node!;

  if (result.case === "two-children" && result.successor) {
    const successor = result.successor;
    const successorPath = result.successorPath.map((node) => node.id);
    const fullPath = [...path, ...successorPath];

    steps.push(
      makeStep({
        tree,
        kind: "visit",
        activeIds: [target.id, successor.id],
        pathIds: fullPath,
        visitedIds: [...path],
        message: `${value} tem dois filhos. O sucessor em ordem é ${successor.value}.`,
      }),
    );

    steps.push(
      makeStep({
        tree: result.tree,
        kind: "remove",
        activeIds: [target.id],
        pathIds: [...path],
        visitedIds: [...path],
        message: `${successor.value} assume o lugar de ${value}; o nó sucessor foi removido.`,
      }),
    );
  } else if (result.case === "one-child") {
    const replacement = findNodeById(tree, result.replacementId);
    steps.push(
      makeStep({
        tree: result.tree,
        kind: "remove",
        activeIds: result.replacementId ? [result.replacementId] : [],
        pathIds: [...path],
        visitedIds: [...path],
        message: replacement
          ? `${value} removido; o filho único ${replacement.value} subiu para o lugar.`
          : `${value} removido.`,
      }),
    );
  } else {
    steps.push(
      makeStep({
        tree: result.tree,
        kind: "remove",
        activeIds: result.parentId ? [result.parentId] : [],
        pathIds: [...path],
        visitedIds: [...path],
        message: `${value} removido (nó folha).`,
      }),
    );
  }

  return binaryResult(
    steps,
    result.tree,
    "success",
    `Remover ${value}`,
  );
}

export function traversalOperation(
  tree: Tree,
  order: TraversalOrder,
  treeKind: "bst" | "avl" = "bst",
): OperationResult {
  const label = traversalLabels(treeKind)[order];
  const visits = traverse(tree, order);
  const steps: Step[] = [];
  const output: number[] = [];
  const visited: NodeId[] = [];

  for (const visit of visits) {
    output.push(visit.value);
    visited.push(visit.id);
    steps.push(
      makeStep({
        tree,
        kind: "visit",
        activeIds: [visit.id],
        visitedIds: [...visited],
        output: [...output],
        message: `${label}: visitando ${visit.value}.`,
      }),
    );
  }

  if (steps.length === 0) {
    steps.push(
      makeStep({
        tree,
        kind: "done",
        message: "A árvore está vazia — não há o que percorrer.",
      }),
    );
  } else {
    steps.push(
      makeStep({
        tree,
        kind: "done",
        visitedIds: [...visited],
        output: [...output],
        message: `${label} concluído — ${visits.length} ${visits.length === 1 ? "nó visitado" : "nós visitados"}.`,
      }),
    );
  }

  return binaryResult(
    steps,
    tree,
    "success",
    `Percurso ${label}`,
    treeKind,
  );
}

/* ------------------------------------------------------------------ */
/* AVL                                                                 */
/* ------------------------------------------------------------------ */

const ROTATION_NAMES = {
  LL: "simples à direita (LL)",
  RR: "simples à esquerda (RR)",
  LR: "dupla esquerda-direita (LR)",
  RL: "dupla direita-esquerda (RL)",
} as const;

export function avlInsertOperation(tree: Tree, value: number): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];
  let current = tree;

  while (current) {
    path.push(current.id);
    if (value === current.value) {
      steps.push(
        makeStep({
          tree,
          kind: "duplicate",
          activeIds: [current.id],
          pathIds: [...path],
          compare: "equal",
          message: `${value} já existe na árvore. A inserção foi ignorada.`,
        }),
      );
      return binaryResult(steps, tree, "duplicate", `Inserir ${value}`, "avl");
    }
    const direction: "left" | "right" = value < current.value ? "left" : "right";
    steps.push(
      makeStep({
        tree,
        kind: "compare",
        activeIds: [current.id],
        pathIds: [...path],
        compare: direction,
        message: `${value} ${direction === "left" ? "<" : ">"} ${current.value}: desço para a ${direction === "left" ? "esquerda" : "direita"}.`,
      }),
    );
    current = direction === "left" ? current.left : current.right;
  }

  const result = insertAvl(tree, value);
  const newId = result.nodeId!;
  let snapshot = result.baseTree;

  steps.push(
    makeStep({
      tree: snapshot,
      kind: "insert",
      activeIds: [newId],
      pathIds: [...path, newId],
      visitedIds: [...path, newId],
      message: `${value} inserido como folha. Agora verifico o fator de balanceamento no caminho de volta.`,
    }),
  );

  for (const rotation of result.rotations) {
    const replaced = replaceSubtree(snapshot, rotation.pivotId, rotation.subtree);
    snapshot = replaced.tree;
    steps.push(
      makeStep({
        tree: snapshot,
        kind: "rotate",
        activeIds: [rotation.subtree.id],
        pathIds: [...path],
        visitedIds: [...path],
        message: `Rotação ${ROTATION_NAMES[rotation.kind]} em ${rotation.pivotValue} para restaurar o balanceamento.`,
      }),
    );
  }

  if (result.rotations.length > 0) {
    steps.push(
      makeStep({
        tree: result.tree,
        kind: "done",
        activeIds: [newId],
        visitedIds: [...path, newId],
        message: `Inserção concluída com ${result.rotations.length} ${result.rotations.length === 1 ? "rotação" : "rotações"}.`,
      }),
    );
  }

  return binaryResult(steps, result.tree, "success", `Inserir ${value}`, "avl");
}

export function avlSearchOperation(tree: Tree, value: number): OperationResult {
  return searchOperation(tree, value, "avl");
}

export function avlRemoveOperation(tree: Tree, value: number): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];
  const found = search(tree, value);

  for (const node of found.path) {
    path.push(node.id);
    if (value === node.value) break;
    const direction: "left" | "right" = value < node.value ? "left" : "right";
    steps.push(
      makeStep({
        tree,
        kind: "compare",
        activeIds: [node.id],
        pathIds: [...path],
        compare: direction,
        message: `${value} ${direction === "left" ? "<" : ">"} ${node.value}: desço para a ${direction === "left" ? "esquerda" : "direita"}.`,
      }),
    );
  }

  if (!found.found) {
    steps.push(
      makeStep({
        tree,
        kind: "not-found",
        pathIds: [...path],
        visitedIds: [...path],
        message: `${value} não está na árvore. Nada para remover.`,
      }),
    );
    return binaryResult(steps, tree, "not-found", `Remover ${value}`, "avl");
  }

  const result = removeAvl(tree, value);
  const target = found.node!;

  const message =
    result.case === "two-children"
      ? `${value} tem dois filhos; o sucessor ${result.successorValue} assume seu lugar e o balanceamento é refeito.`
      : result.case === "one-child"
        ? `${value} tem um filho; ele sobe para o lugar e o caminho é rebalanceado.`
        : `${value} removido (folha); o caminho é rebalanceado.`;

  steps.push(
    makeStep({
      tree: result.baseTree,
      kind: "remove",
      activeIds: [target.id],
      pathIds: [...path],
      visitedIds: [...path],
      message,
    }),
  );

  let snapshot = result.baseTree;
  for (const rotation of result.rotations) {
    const replaced = replaceSubtree(snapshot, rotation.pivotId, rotation.subtree);
    snapshot = replaced.tree;
    steps.push(
      makeStep({
        tree: snapshot,
        kind: "rotate",
        activeIds: [rotation.subtree.id],
        pathIds: [...path],
        visitedIds: [...path],
        message: `Rotação ${ROTATION_NAMES[rotation.kind]} em ${rotation.pivotValue} para restaurar o balanceamento.`,
      }),
    );
  }

  if (result.rotations.length > 0) {
    steps.push(
      makeStep({
        tree: result.tree,
        kind: "done",
        pathIds: [...path],
        message: `Remoção concluída com ${result.rotations.length} ${result.rotations.length === 1 ? "rotação" : "rotações"}.`,
      }),
    );
  }

  return binaryResult(steps, result.tree, "success", `Remover ${value}`, "avl");
}

/* ------------------------------------------------------------------ */
/* B, B* e B+                                                          */
/* ------------------------------------------------------------------ */

function multiwayResult(
  steps: Step[],
  finalBTree: BTree,
  outcome: OperationResult["outcome"],
  title: string,
  treeKind: MultiwayKind,
): OperationResult {
  return {
    model: "multiway",
    treeKind,
    steps,
    finalTree: null,
    finalBTree,
    outcome,
    title,
  };
}

function keyList(node: BNode): string {
  return `[${node.keys.join(", ")}]`;
}

function bCompareStep(
  tree: BTree,
  node: BNode,
  value: number,
  kind: MultiwayKind,
  path: NodeId[],
): Step {
  if (isLeaf(node)) {
    return makeStep({
      tree: null,
      btree: tree,
      kind: "compare",
      activeIds: [node.id],
      pathIds: [...path],
      message: `Cheguei à folha ${keyList(node)} para procurar ${value}.`,
    });
  }

  const index =
    kind === "bplus" ? upperBound(node.keys, value) : lowerBound(node.keys, value);
  return makeStep({
    tree: null,
    btree: tree,
    kind: "compare",
    activeIds: [node.id],
    pathIds: [...path],
    message: `No nó ${keyList(node)}, ${value} segue pelo filho ${index + 1} de ${node.children.length}.`,
  });
}

export function bSearchOperation(
  tree: BTree,
  value: number,
  kind: MultiwayKind,
): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];
  const result = searchB(tree, value, kind);

  for (const node of result.path) {
    path.push(node.id);
    if (result.found && result.node?.id === node.id) {
      steps.push(
        makeStep({
          tree: null,
          btree: tree,
          kind: "found",
          activeIds: [node.id],
          pathIds: [...path],
          visitedIds: [...path],
          compare: "equal",
          message: `${value} encontrado no nó ${keyList(node)}!`,
        }),
      );
      return multiwayResult(steps, tree, "success", `Buscar ${value}`, kind);
    }
    steps.push(bCompareStep(tree, node, value, kind, path));
  }

  steps.push(
    makeStep({
      tree: null,
      btree: tree,
      kind: "not-found",
      pathIds: [...path],
      visitedIds: [...path],
      message: `${value} não está na árvore.`,
    }),
  );

  return multiwayResult(steps, tree, "not-found", `Buscar ${value}`, kind);
}

export function bInsertOperation(
  tree: BTree,
  value: number,
  kind: MultiwayKind,
): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];
  let current = tree;

  while (current) {
    path.push(current.id);
    const index =
      kind === "bplus"
        ? upperBound(current.keys, value)
        : lowerBound(current.keys, value);

    if (kind !== "bplus" && current.keys[index] === value) {
      steps.push(
        makeStep({
          tree: null,
          btree: tree,
          kind: "duplicate",
          activeIds: [current.id],
          pathIds: [...path],
          compare: "equal",
          message: `${value} já existe na árvore. A inserção foi ignorada.`,
        }),
      );
      return multiwayResult(steps, tree, "duplicate", `Inserir ${value}`, kind);
    }

    if (isLeaf(current)) {
      const leafIndex = lowerBound(current.keys, value);
      if (current.keys[leafIndex] === value) {
        steps.push(
          makeStep({
            tree: null,
            btree: tree,
            kind: "duplicate",
            activeIds: [current.id],
            pathIds: [...path],
            compare: "equal",
            message: `${value} já existe na árvore. A inserção foi ignorada.`,
          }),
        );
        return multiwayResult(steps, tree, "duplicate", `Inserir ${value}`, kind);
      }
      steps.push(bCompareStep(tree, current, value, kind, path));
      break;
    }

    steps.push(bCompareStep(tree, current, value, kind, path));
    current = current.children[index];
  }

  const result = insertB(tree, value, kind);

  steps.push(
    makeStep({
      tree: null,
      btree: result.baseTree,
      kind: "insert",
      activeIds: result.nodeId ? [result.nodeId] : [],
      pathIds: [...path],
      visitedIds: [...path],
      message: `${value} inserido na folha. A árvore ${kind === "bstar" ? "B* redistribui antes de dividir" : "cresce de baixo para cima"}.`,
    }),
  );

  for (const event of result.events) {
    steps.push(
      makeStep({
        tree: null,
        btree: event.snapshot,
        kind: event.kind,
        activeIds: event.activeIds,
        pathIds: [...path],
        visitedIds: [...path],
        message: event.message,
      }),
    );
  }

  if (result.events.length > 0) {
    steps.push(
      makeStep({
        tree: null,
        btree: result.tree,
        kind: "done",
        activeIds: result.nodeId ? [result.nodeId] : [],
        visitedIds: [...path],
        message: `Inserção concluída com ${result.events.length} ${result.events.length === 1 ? "ajuste estrutural" : "ajustes estruturais"}.`,
      }),
    );
  }

  return multiwayResult(steps, result.tree, "success", `Inserir ${value}`, kind);
}

export function bRemoveOperation(
  tree: BTree,
  value: number,
  kind: MultiwayKind,
): OperationResult {
  const steps: Step[] = [];
  const path: NodeId[] = [];
  const found = searchB(tree, value, kind);

  for (const node of found.path) {
    path.push(node.id);
    steps.push(bCompareStep(tree, node, value, kind, path));
  }

  if (!found.found) {
    steps.push(
      makeStep({
        tree: null,
        btree: tree,
        kind: "not-found",
        pathIds: [...path],
        visitedIds: [...path],
        message: `${value} não está na árvore. Nada para remover.`,
      }),
    );
    return multiwayResult(steps, tree, "not-found", `Remover ${value}`, kind);
  }

  const result = removeB(tree, value, kind);
  const internal = found.node ? !isLeaf(found.node) : false;

  for (const event of result.events) {
    steps.push(
      makeStep({
        tree: null,
        btree: event.snapshot,
        kind: event.kind,
        activeIds: event.activeIds,
        pathIds: [...path],
        visitedIds: [...path],
        message: event.message,
      }),
    );
  }

  steps.push(
    makeStep({
      tree: null,
      btree: result.tree,
      kind: "remove",
      activeIds: found.node ? [found.node.id] : [],
      pathIds: [...path],
      visitedIds: [...path],
      message: internal
        ? `${value} estava em um nó interno; o predecessor assumiu seu lugar e a árvore foi reequilibrada.`
        : `${value} removido da folha e a árvore foi reequilibrada.`,
    }),
  );

  return multiwayResult(steps, result.tree, "success", `Remover ${value}`, kind);
}

export function bTraversalOperation(
  tree: BTree,
  order: TraversalOrder,
  kind: MultiwayKind,
): OperationResult {
  const label = traversalLabels(kind)[order];
  const visits = traverseB(tree, order, kind);
  const steps: Step[] = [];
  const output: number[] = [];
  const visited: NodeId[] = [];

  for (const visit of visits) {
    output.push(visit.value);
    visited.push(visit.id);
    steps.push(
      makeStep({
        tree: null,
        btree: tree,
        kind: "visit",
        activeIds: [visit.id],
        visitedIds: [...visited],
        output: [...output],
        message: `${label}: visitando ${visit.value}.`,
      }),
    );
  }

  if (steps.length === 0) {
    steps.push(
      makeStep({
        tree: null,
        btree: tree,
        kind: "done",
        message: "A árvore está vazia — não há o que percorrer.",
      }),
    );
  } else {
    steps.push(
      makeStep({
        tree: null,
        btree: tree,
        kind: "done",
        visitedIds: [...visited],
        output: [...output],
        message: `${label} concluído — ${visits.length} ${visits.length === 1 ? "chave visitada" : "chaves visitadas"}.`,
      }),
    );
  }

  return multiwayResult(steps, tree, "success", `Percurso ${label}`, kind);
}

/* ------------------------------------------------------------------ */
/* Despacho por tipo                                                   */
/* ------------------------------------------------------------------ */

export function insertForKind(
  kind: TreeKind,
  tree: Tree,
  btree: BTree,
  value: number,
): OperationResult {
  if (kind === "bst") return insertOperation(tree, value);
  if (kind === "avl") return avlInsertOperation(tree, value);
  return bInsertOperation(btree, value, kind);
}

export function searchForKind(
  kind: TreeKind,
  tree: Tree,
  btree: BTree,
  value: number,
): OperationResult {
  if (kind === "bst") return searchOperation(tree, value);
  if (kind === "avl") return avlSearchOperation(tree, value);
  return bSearchOperation(btree, value, kind);
}

export function removeForKind(
  kind: TreeKind,
  tree: Tree,
  btree: BTree,
  value: number,
): OperationResult {
  if (kind === "bst") return removeOperation(tree, value);
  if (kind === "avl") return avlRemoveOperation(tree, value);
  return bRemoveOperation(btree, value, kind);
}

export function traversalForKind(
  kind: TreeKind,
  tree: Tree,
  btree: BTree,
  order: TraversalOrder,
): OperationResult {
  if (kind === "bst") return traversalOperation(tree, order);
  if (kind === "avl") return traversalOperation(tree, order, "avl");
  return bTraversalOperation(btree, order, kind);
}
