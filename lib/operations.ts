import {
  findNodeById,
  insert,
  remove,
  search,
} from "./bst";
import { TRAVERSAL_LABELS } from "./constants";
import { traverse } from "./traversals";
import type {
  NodeId,
  OperationResult,
  Step,
  TraversalOrder,
  Tree,
  TreeNode,
} from "./types";

type StepInput = Pick<Step, "tree" | "kind" | "message"> & Partial<Step>;

function makeStep(input: StepInput): Step {
  return {
    activeIds: [],
    pathIds: [],
    visitedIds: [],
    output: [],
    ...input,
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
      return {
        steps,
        finalTree: tree,
        outcome: "duplicate",
        title: `Inserir ${value}`,
      };
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

  return {
    steps,
    finalTree: result.tree,
    outcome: "success",
    title: `Inserir ${value}`,
  };
}

export function searchOperation(tree: Tree, value: number): OperationResult {
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
      return {
        steps,
        finalTree: tree,
        outcome: "success",
        title: `Buscar ${value}`,
      };
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

  return {
    steps,
    finalTree: tree,
    outcome: "not-found",
    title: `Buscar ${value}`,
  };
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
    return {
      steps,
      finalTree: tree,
      outcome: "not-found",
      title: `Remover ${value}`,
    };
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

  return {
    steps,
    finalTree: result.tree,
    outcome: "success",
    title: `Remover ${value}`,
  };
}

export function traversalOperation(
  tree: Tree,
  order: TraversalOrder,
): OperationResult {
  const label = TRAVERSAL_LABELS[order];
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

  return {
    steps,
    finalTree: tree,
    outcome: "success",
    title: `Percurso ${label}`,
  };
}
