import type { NodeId, Tree, TreeNode } from "./types";

/* ------------------------------------------------------------------ */
/* Criação                                                             */
/* ------------------------------------------------------------------ */

function newId(): NodeId {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNode(value: number, id: NodeId = newId()): TreeNode {
  return { id, value, left: null, right: null };
}

/* ------------------------------------------------------------------ */
/* Leituras                                                            */
/* ------------------------------------------------------------------ */

export function findNodeById(tree: Tree, id: NodeId | null): TreeNode | null {
  if (!tree || !id) return null;
  if (tree.id === id) return tree;
  return findNodeById(tree.left, id) ?? findNodeById(tree.right, id);
}

export function findNodeByValue(tree: Tree, value: number): TreeNode | null {
  let current = tree;
  while (current) {
    if (value === current.value) return current;
    current = value < current.value ? current.left : current.right;
  }
  return null;
}

export interface SearchResult {
  found: boolean;
  node: TreeNode | null;
  path: TreeNode[];
}

export function search(tree: Tree, value: number): SearchResult {
  const path: TreeNode[] = [];
  let current = tree;
  while (current) {
    path.push(current);
    if (value === current.value) {
      return { found: true, node: current, path };
    }
    current = value < current.value ? current.left : current.right;
  }
  return { found: false, node: null, path };
}

export function getPathToNodeId(tree: Tree, id: NodeId): TreeNode[] {
  const path: TreeNode[] = [];

  function walk(node: TreeNode | null): boolean {
    if (!node) return false;
    path.push(node);
    if (node.id === id) return true;
    if (walk(node.left)) return true;
    if (walk(node.right)) return true;
    path.pop();
    return false;
  }

  walk(tree);
  return path;
}

export function getPathToValue(tree: Tree, value: number): TreeNode[] {
  return search(tree, value).path;
}

export function ancestorBounds(path: TreeNode[]): {
  lower: number;
  upper: number;
} {
  let lower = -Infinity;
  let upper = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const parent = path[i];
    const next = path[i + 1];
    if (next.value < parent.value) {
      upper = Math.min(upper, parent.value);
    } else {
      lower = Math.max(lower, parent.value);
    }
  }
  return { lower, upper };
}

export function countNodes(tree: Tree): number {
  return tree ? 1 + countNodes(tree.left) + countNodes(tree.right) : 0;
}

export function heightOf(tree: Tree): number {
  if (!tree) return 0;
  return 1 + Math.max(heightOf(tree.left), heightOf(tree.right));
}

export function inorderValues(tree: Tree): number[] {
  const values: number[] = [];
  const walk = (node: Tree) => {
    if (!node) return;
    walk(node.left);
    values.push(node.value);
    walk(node.right);
  };
  walk(tree);
  return values;
}

export function preorderValues(tree: Tree): number[] {
  const values: number[] = [];
  const walk = (node: Tree) => {
    if (!node) return;
    values.push(node.value);
    walk(node.left);
    walk(node.right);
  };
  walk(tree);
  return values;
}

/* ------------------------------------------------------------------ */
/* Inserção                                                            */
/* ------------------------------------------------------------------ */

export interface InsertResult {
  tree: Tree;
  inserted: boolean;
  nodeId: NodeId | null;
  parentId: NodeId | null;
  side: "left" | "right" | "root" | null;
  depth: number;
}

interface InsertOutcome {
  node: TreeNode;
  inserted: boolean;
  nodeId: NodeId;
  parentId: NodeId | null;
  side: "left" | "right" | "root" | null;
  depth: number;
}

function insertAt(node: TreeNode, value: number, depth: number): InsertOutcome {
  if (value === node.value) {
    return {
      node,
      inserted: false,
      nodeId: node.id,
      parentId: null,
      side: null,
      depth,
    };
  }

  if (value < node.value) {
    if (!node.left) {
      const child = createNode(value);
      return {
        node: { ...node, left: child },
        inserted: true,
        nodeId: child.id,
        parentId: node.id,
        side: "left",
        depth: depth + 1,
      };
    }
    const result = insertAt(node.left, value, depth + 1);
    if (!result.inserted) return { ...result, node };
    return { ...result, node: { ...node, left: result.node } };
  }

  if (!node.right) {
    const child = createNode(value);
    return {
      node: { ...node, right: child },
      inserted: true,
      nodeId: child.id,
      parentId: node.id,
      side: "right",
      depth: depth + 1,
    };
  }
  const result = insertAt(node.right, value, depth + 1);
  if (!result.inserted) return { ...result, node };
  return { ...result, node: { ...node, right: result.node } };
}

export function insert(tree: Tree, value: number): InsertResult {
  if (!tree) {
    const root = createNode(value);
    return {
      tree: root,
      inserted: true,
      nodeId: root.id,
      parentId: null,
      side: "root",
      depth: 0,
    };
  }
  const result = insertAt(tree, value, 0);
  return {
    tree: result.node,
    inserted: result.inserted,
    nodeId: result.nodeId,
    parentId: result.parentId,
    side: result.side,
    depth: result.depth,
  };
}

export function buildTree(values: number[]): Tree {
  let tree: Tree = null;
  for (const value of values) {
    if (Number.isSafeInteger(value)) tree = insert(tree, value).tree;
  }
  return tree;
}

/* ------------------------------------------------------------------ */
/* Remoção                                                             */
/* ------------------------------------------------------------------ */

export type RemoveCase = "leaf" | "one-child" | "two-children";

export interface RemoveResult {
  tree: Tree;
  removed: boolean;
  target: TreeNode | null;
  case: RemoveCase | null;
  parentId: NodeId | null;
  replacementId: NodeId | null;
  successor: TreeNode | null;
  successorPath: TreeNode[];
}

interface RemoveOutcome {
  node: TreeNode | null;
  removed: boolean;
  target: TreeNode | null;
  case: RemoveCase | null;
  parentId: NodeId | null;
  replacementId: NodeId | null;
  successor: TreeNode | null;
  successorPath: TreeNode[];
}

function removeMin(node: TreeNode): { node: TreeNode | null; min: TreeNode } {
  if (!node.left) return { node: node.right, min: node };
  const result = removeMin(node.left);
  return { node: { ...node, left: result.node }, min: result.min };
}

function removeAt(
  node: TreeNode | null,
  value: number,
  parentId: NodeId | null,
): RemoveOutcome {
  if (!node) {
    return {
      node: null,
      removed: false,
      target: null,
      case: null,
      parentId,
      replacementId: null,
      successor: null,
      successorPath: [],
    };
  }

  if (value < node.value) {
    const result = removeAt(node.left, value, node.id);
    if (!result.removed) return { ...result, node };
    return { ...result, node: { ...node, left: result.node } };
  }

  if (value > node.value) {
    const result = removeAt(node.right, value, node.id);
    if (!result.removed) return { ...result, node };
    return { ...result, node: { ...node, right: result.node } };
  }

  if (!node.left && !node.right) {
    return {
      node: null,
      removed: true,
      target: node,
      case: "leaf",
      parentId,
      replacementId: null,
      successor: null,
      successorPath: [],
    };
  }

  if (!node.left) {
    return {
      node: node.right,
      removed: true,
      target: node,
      case: "one-child",
      parentId,
      replacementId: node.right!.id,
      successor: null,
      successorPath: [],
    };
  }

  if (!node.right) {
    return {
      node: node.left,
      removed: true,
      target: node,
      case: "one-child",
      parentId,
      replacementId: node.left!.id,
      successor: null,
      successorPath: [],
    };
  }

  const successorPath: TreeNode[] = [];
  let current: TreeNode | null = node.right;
  while (current) {
    successorPath.push(current);
    if (!current.left) break;
    current = current.left;
  }
  const successor = successorPath[successorPath.length - 1] ?? null;
  const right = removeMin(node.right);

  return {
    node: { ...node, value: successor ? successor.value : node.value, right: right.node },
    removed: true,
    target: node,
    case: "two-children",
    parentId,
    replacementId: node.id,
    successor,
    successorPath,
  };
}

export function remove(tree: Tree, value: number): RemoveResult {
  const result = removeAt(tree, value, null);
  return {
    tree: result.node,
    removed: result.removed,
    target: result.target,
    case: result.case,
    parentId: result.parentId,
    replacementId: result.replacementId,
    successor: result.successor,
    successorPath: result.successorPath,
  };
}

/* ------------------------------------------------------------------ */
/* Edição estrutural (editor livre)                                    */
/* ------------------------------------------------------------------ */

export function replaceSubtree(
  tree: Tree,
  id: NodeId,
  replacement: Tree,
): { tree: Tree; found: boolean } {
  if (!tree) return { tree: null, found: false };
  if (tree.id === id) return { tree: replacement, found: true };

  const left = replaceSubtree(tree.left, id, replacement);
  if (left.found) return { tree: { ...tree, left: left.tree }, found: true };

  const right = replaceSubtree(tree.right, id, replacement);
  if (right.found) return { tree: { ...tree, right: right.tree }, found: true };

  return { tree, found: false };
}

export function setChild(
  tree: Tree,
  parentId: NodeId,
  side: "left" | "right",
  child: TreeNode,
): Tree {
  if (!tree) return tree;
  if (tree.id === parentId) return { ...tree, [side]: child };

  const left = setChild(tree.left, parentId, side, child);
  if (left !== tree.left) return { ...tree, left };

  const right = setChild(tree.right, parentId, side, child);
  if (right !== tree.right) return { ...tree, right };

  return tree;
}

function insertExisting(root: TreeNode | null, incoming: TreeNode): TreeNode {
  if (!root) return incoming;
  if (incoming.value < root.value) {
    return { ...root, left: insertExisting(root.left, incoming) };
  }
  if (incoming.value > root.value) {
    return { ...root, right: insertExisting(root.right, incoming) };
  }
  return root;
}

function formatBound(value: number): string {
  if (value === -Infinity) return "−∞";
  if (value === Infinity) return "+∞";
  return String(value);
}

export function formatInterval(lower: number, upper: number): string {
  return `${formatBound(lower)} < valor < ${formatBound(upper)}`;
}

export interface EditResult {
  tree: Tree;
  error: string | null;
  nodeId: NodeId | null;
}

/**
 * Reconstrói a subárvore enraizada em `nodeId` com um novo valor.
 * O novo valor precisa respeitar os limites dos ancestrais; os descendentes
 * são reinseridos em pré-ordem, preservando os IDs para as animações.
 */
export function editNodeValue(
  tree: Tree,
  nodeId: NodeId,
  newValue: number,
): EditResult {
  const path = getPathToNodeId(tree, nodeId);
  if (path.length === 0) {
    return { tree, error: "Nó não encontrado.", nodeId: null };
  }

  const target = path[path.length - 1];
  if (target.value === newValue) {
    return { tree, error: null, nodeId: target.id };
  }

  const duplicate = findNodeByValue(tree, newValue);
  if (duplicate && duplicate.id !== nodeId) {
    return { tree, error: `O valor ${newValue} já existe na árvore.`, nodeId: null };
  }

  const { lower, upper } = ancestorBounds(path);
  if (newValue <= lower || newValue >= upper) {
    return {
      tree,
      error: `Novo valor fora do intervalo permitido: ${formatInterval(lower, upper)}.`,
      nodeId: null,
    };
  }

  const values: number[] = [];
  const ids = new Map<number, NodeId>();

  const collect = (node: TreeNode) => {
    const value = node.id === nodeId ? newValue : node.value;
    values.push(value);
    ids.set(value, node.id);
    if (node.left) collect(node.left);
    if (node.right) collect(node.right);
  };
  collect(target);

  let subtree: TreeNode | null = null;
  for (const value of values) {
    subtree = insertExisting(subtree, createNode(value, ids.get(value)!));
  }

  if (!subtree) {
    return { tree, error: "Não foi possível reconstruir a subárvore.", nodeId: null };
  }

  const replaced = replaceSubtree(tree, nodeId, subtree);
  if (!replaced.found) {
    return { tree, error: "Nó não encontrado.", nodeId: null };
  }

  return { tree: replaced.tree, error: null, nodeId: target.id };
}

export interface AddChildResult {
  tree: Tree;
  error: string | null;
  nodeId: NodeId | null;
}

export function addChildValue(
  tree: Tree,
  parentId: NodeId,
  side: "left" | "right",
  value: number,
): AddChildResult {
  const path = getPathToNodeId(tree, parentId);
  if (path.length === 0) {
    return { tree, error: "Nó não encontrado.", nodeId: null };
  }

  const parent = path[path.length - 1];
  if (parent[side]) {
    return {
      tree,
      error: "Esse lado já tem um filho. Remova-o antes de adicionar outro.",
      nodeId: null,
    };
  }

  if (findNodeByValue(tree, value)) {
    return {
      tree,
      error: `O valor ${value} já existe na árvore.`,
      nodeId: null,
    };
  }

  const bounds = ancestorBounds(path);
  const lower = side === "left" ? bounds.lower : Math.max(bounds.lower, parent.value);
  const upper = side === "left" ? Math.min(bounds.upper, parent.value) : bounds.upper;

  if (value <= lower || value >= upper) {
    return {
      tree,
      error: `Valor fora do intervalo permitido: ${formatInterval(lower, upper)}.`,
      nodeId: null,
    };
  }

  const child = createNode(value);
  return {
    tree: setChild(tree, parentId, side, child),
    error: null,
    nodeId: child.id,
  };
}

/* ------------------------------------------------------------------ */
/* Validação (hidratação do localStorage)                              */
/* ------------------------------------------------------------------ */

export function isValidTree(value: unknown): value is Tree {
  const ids = new Set<string>();

  function walk(node: unknown, lower: number, upper: number): boolean {
    if (node === null) return true;
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      return false;
    }

    const candidate = node as Record<string, unknown>;
    if (
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      ids.has(candidate.id)
    ) {
      return false;
    }
    if (
      typeof candidate.value !== "number" ||
      !Number.isSafeInteger(candidate.value)
    ) {
      return false;
    }
    if (candidate.value <= lower || candidate.value >= upper) return false;
    if (!("left" in candidate) || !("right" in candidate)) return false;

    ids.add(candidate.id);
    return (
      walk(candidate.left, lower, candidate.value) &&
      walk(candidate.right, candidate.value, upper)
    );
  }

  return value === null || walk(value, -Infinity, Infinity);
}
