import {
  addChildValue,
  createNode,
  editNodeValue,
  heightOf,
  isValidTree,
} from "./bst";
import type { NodeId, Tree, TreeNode } from "./types";

export type RotationKind = "LL" | "RR" | "LR" | "RL";

export interface RotationEvent {
  /** Nó que estava desbalanceado antes da rotação. */
  pivotId: NodeId;
  pivotValue: number;
  kind: RotationKind;
  /** Subárvore já rotacionada, pronta para substituir o pivô. */
  subtree: TreeNode;
}

/* ------------------------------------------------------------------ */
/* Rotações                                                            */
/* ------------------------------------------------------------------ */

function rotateRight(node: TreeNode): TreeNode {
  const pivot = node.left;
  if (!pivot) return node;
  return {
    ...pivot,
    right: { ...node, left: pivot.right },
  };
}

function rotateLeft(node: TreeNode): TreeNode {
  const pivot = node.right;
  if (!pivot) return node;
  return {
    ...pivot,
    left: { ...node, right: pivot.left },
  };
}

export function balanceFactor(node: TreeNode): number {
  return heightOf(node.left) - heightOf(node.right);
}

function balanceNode(node: TreeNode): {
  node: TreeNode;
  event: RotationEvent | null;
} {
  const factor = balanceFactor(node);

  if (factor > 1) {
    const left = node.left!;
    if (heightOf(left.left) >= heightOf(left.right)) {
      return {
        node: rotateRight(node),
        event: {
          pivotId: node.id,
          pivotValue: node.value,
          kind: "LL",
          subtree: rotateRight(node),
        },
      };
    }
    const rotated = rotateRight({ ...node, left: rotateLeft(left) });
    return {
      node: rotated,
      event: {
        pivotId: node.id,
        pivotValue: node.value,
        kind: "LR",
        subtree: rotated,
      },
    };
  }

  if (factor < -1) {
    const right = node.right!;
    if (heightOf(right.right) >= heightOf(right.left)) {
      return {
        node: rotateLeft(node),
        event: {
          pivotId: node.id,
          pivotValue: node.value,
          kind: "RR",
          subtree: rotateLeft(node),
        },
      };
    }
    const rotated = rotateLeft({ ...node, right: rotateRight(right) });
    return {
      node: rotated,
      event: {
        pivotId: node.id,
        pivotValue: node.value,
        kind: "RL",
        subtree: rotated,
      },
    };
  }

  return { node, event: null };
}

/* ------------------------------------------------------------------ */
/* Inserção                                                            */
/* ------------------------------------------------------------------ */

export interface AvlInsertResult {
  tree: Tree;
  /** Árvore imediatamente após a inserção binária, antes das rotações. */
  baseTree: Tree;
  inserted: boolean;
  nodeId: NodeId | null;
  rotations: RotationEvent[];
}

interface InsertOutcome {
  node: TreeNode;
  base: TreeNode;
  inserted: boolean;
  nodeId: NodeId;
  rotations: RotationEvent[];
}

function insertAt(node: TreeNode, value: number): InsertOutcome {
  if (value === node.value) {
    return {
      node,
      base: node,
      inserted: false,
      nodeId: node.id,
      rotations: [],
    };
  }

  const direction = value < node.value ? "left" : "right";

  if (!node[direction]) {
    const child = createNode(value);
    const balanced = balanceNode({ ...node, [direction]: child });
    return {
      node: balanced.node,
      base: { ...node, [direction]: child },
      inserted: true,
      nodeId: child.id,
      rotations: balanced.event ? [balanced.event] : [],
    };
  }

  const result = insertAt(node[direction]!, value);
  if (!result.inserted) {
    return { ...result, node, base: node };
  }

  const base = { ...node, [direction]: result.base };
  const balanced = balanceNode({ ...node, [direction]: result.node });
  return {
    node: balanced.node,
    base,
    inserted: true,
    nodeId: result.nodeId,
    rotations: balanced.event
      ? [...result.rotations, balanced.event]
      : result.rotations,
  };
}

export function insertAvl(tree: Tree, value: number): AvlInsertResult {
  if (!tree) {
    const root = createNode(value);
    return {
      tree: root,
      baseTree: root,
      inserted: true,
      nodeId: root.id,
      rotations: [],
    };
  }

  const result = insertAt(tree, value);
  return {
    tree: result.node,
    baseTree: result.base,
    inserted: result.inserted,
    nodeId: result.inserted ? result.nodeId : null,
    rotations: result.rotations,
  };
}

export function buildAvlTree(values: number[]): Tree {
  let tree: Tree = null;
  for (const value of values) {
    if (Number.isSafeInteger(value)) tree = insertAvl(tree, value).tree;
  }
  return tree;
}

/* ------------------------------------------------------------------ */
/* Remoção                                                             */
/* ------------------------------------------------------------------ */

export type RemoveCase = "leaf" | "one-child" | "two-children";

export interface AvlRemoveResult {
  tree: Tree;
  baseTree: Tree;
  removed: boolean;
  target: TreeNode | null;
  case: RemoveCase | null;
  successorValue: number | null;
  rotations: RotationEvent[];
}

interface DeleteOutcome {
  node: Tree;
  base: Tree;
  removed: boolean;
  target: TreeNode | null;
  case: RemoveCase | null;
  successorValue: number | null;
  rotations: RotationEvent[];
}

function deleteAt(node: Tree, value: number): DeleteOutcome {
  if (!node) {
    return {
      node: null,
      base: null,
      removed: false,
      target: null,
      case: null,
      successorValue: null,
      rotations: [],
    };
  }

  if (value < node.value) {
    const result = deleteAt(node.left, value);
    if (!result.removed) return { ...result, node, base: node };
    const balanced = balanceNode({ ...node, left: result.node });
    return {
      ...result,
      node: balanced.node,
      base: { ...node, left: result.base },
      rotations: balanced.event
        ? [...result.rotations, balanced.event]
        : result.rotations,
    };
  }

  if (value > node.value) {
    const result = deleteAt(node.right, value);
    if (!result.removed) return { ...result, node, base: node };
    const balanced = balanceNode({ ...node, right: result.node });
    return {
      ...result,
      node: balanced.node,
      base: { ...node, right: result.base },
      rotations: balanced.event
        ? [...result.rotations, balanced.event]
        : result.rotations,
    };
  }

  if (!node.left && !node.right) {
    return {
      node: null,
      base: null,
      removed: true,
      target: node,
      case: "leaf",
      successorValue: null,
      rotations: [],
    };
  }

  if (!node.left || !node.right) {
    return {
      node: node.left ?? node.right,
      base: node.left ?? node.right,
      removed: true,
      target: node,
      case: "one-child",
      successorValue: null,
      rotations: [],
    };
  }

  let current = node.right;
  while (current.left) current = current.left;
  const successorValue = current.value;

  const right = deleteAt(node.right, successorValue);
  const unbalanced = { ...node, value: successorValue, right: right.node };
  const balanced = balanceNode(unbalanced);

  return {
    node: balanced.node,
    base: { ...node, value: successorValue, right: right.base },
    removed: true,
    target: node,
    case: "two-children",
    successorValue,
    rotations: balanced.event
      ? [...right.rotations, balanced.event]
      : right.rotations,
  };
}

export function removeAvl(tree: Tree, value: number): AvlRemoveResult {
  if (!tree) {
    return {
      tree: null,
      baseTree: null,
      removed: false,
      target: null,
      case: null,
      successorValue: null,
      rotations: [],
    };
  }

  const result = deleteAt(tree, value);
  return {
    tree: result.node,
    baseTree: result.base,
    removed: result.removed,
    target: result.target,
    case: result.case,
    successorValue: result.successorValue,
    rotations: result.rotations,
  };
}

/* ------------------------------------------------------------------ */
/* Editor livre                                                        */
/* ------------------------------------------------------------------ */

function rebalanceWholeAux(tree: Tree): Tree {
  if (!tree) return null;
  const left = rebalanceWholeAux(tree.left);
  const right = rebalanceWholeAux(tree.right);
  return balanceNode({ ...tree, left, right }).node;
}

export function rebalanceWhole(tree: Tree): Tree {
  return rebalanceWholeAux(tree);
}

export interface AvlEditResult {
  tree: Tree;
  error: string | null;
  nodeId: NodeId | null;
}

export function editAvlNodeValue(
  tree: Tree,
  nodeId: NodeId,
  newValue: number,
): AvlEditResult {
  const result = editNodeValue(tree, nodeId, newValue);
  if (result.error) return result;
  return { tree: rebalanceWhole(result.tree), error: null, nodeId: result.nodeId };
}

export function addAvlChildValue(
  tree: Tree,
  parentId: NodeId,
  side: "left" | "right",
  value: number,
): AvlEditResult {
  const result = addChildValue(tree, parentId, side, value);
  if (result.error) return result;
  return { tree: rebalanceWhole(result.tree), error: null, nodeId: result.nodeId };
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

export function isValidAvlTree(value: unknown): value is Tree {
  if (!isValidTree(value)) return false;

  const balanced = (node: Tree): boolean => {
    if (!node) return true;
    return (
      Math.abs(heightOf(node.left) - heightOf(node.right)) <= 1 &&
      balanced(node.left) &&
      balanced(node.right)
    );
  };

  return balanced(value);
}
