import {
  BPLUS_MIN_KEYS,
  BSTAR_MIN_KEYS,
  BTREE_MAX_KEYS,
  BTREE_MIN_KEYS,
  BTREE_ORDER,
} from "./constants";
import type { BNode, BTree, MultiwayKind, NodeId } from "./types";

function newId(): NodeId {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bnode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBNode(
  keys: number[],
  children: BNode[] = [],
  id: NodeId = newId(),
): BNode {
  return { id, keys, children };
}

export function isLeaf(node: BNode): boolean {
  return node.children.length === 0;
}

export function minKeysFor(kind: MultiwayKind): number {
  if (kind === "bstar") return BSTAR_MIN_KEYS;
  if (kind === "bplus") return BPLUS_MIN_KEYS;
  return BTREE_MIN_KEYS;
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function lowerBound(keys: number[], value: number): number {
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keys[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function upperBound(keys: number[], value: number): number {
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keys[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}

function childIndex(node: BNode, value: number, kind: MultiwayKind): number {
  return kind === "bplus"
    ? upperBound(node.keys, value)
    : lowerBound(node.keys, value);
}

export interface BSearchResult {
  found: boolean;
  node: BNode | null;
  path: BNode[];
}

export function searchB(tree: BTree, value: number, kind: MultiwayKind): BSearchResult {
  const path: BNode[] = [];
  let current = tree;

  while (current) {
    path.push(current);
    if (kind === "bplus") {
      if (isLeaf(current)) {
        const index = lowerBound(current.keys, value);
        if (current.keys[index] === value) {
          return { found: true, node: current, path };
        }
        return { found: false, node: null, path };
      }
      current = current.children[upperBound(current.keys, value)] ?? null;
      continue;
    }

    const index = lowerBound(current.keys, value);
    if (current.keys[index] === value) {
      return { found: true, node: current, path };
    }
    if (isLeaf(current)) return { found: false, node: null, path };
    current = current.children[index] ?? null;
  }

  return { found: false, node: null, path };
}

export function findBNodeById(tree: BTree, id: NodeId | null): BNode | null {
  if (!tree || !id) return null;
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findBNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function getPathToBNodeId(tree: BTree, id: NodeId): BNode[] {
  const path: BNode[] = [];

  function walk(node: BTree): boolean {
    if (!node) return false;
    path.push(node);
    if (node.id === id) return true;
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    path.pop();
    return false;
  }

  walk(tree);
  return path;
}

export function getPathToBValue(tree: BTree, value: number, kind: MultiwayKind): BNode[] {
  return searchB(tree, value, kind).path;
}

export function countBKeys(tree: BTree): number {
  if (!tree) return 0;
  return tree.keys.length + tree.children.reduce((sum, child) => sum + countBKeys(child), 0);
}

export function countBValues(tree: BTree, kind: MultiwayKind): number {
  if (!tree) return 0;
  if (kind === "bplus") {
    if (isLeaf(tree)) return tree.keys.length;
    return tree.children.reduce((sum, child) => sum + countBValues(child, kind), 0);
  }
  return countBKeys(tree);
}

export function countBNodes(tree: BTree): number {
  if (!tree) return 0;
  return 1 + tree.children.reduce((sum, child) => sum + countBNodes(child), 0);
}

export function heightOfB(tree: BTree): number {
  if (!tree) return 0;
  if (isLeaf(tree)) return 1;
  return 1 + Math.max(...tree.children.map(heightOfB));
}

export function inorderBValues(tree: BTree, kind: MultiwayKind): number[] {
  const values: number[] = [];

  const walk = (node: BTree) => {
    if (!node) return;
    if (kind === "bplus" && isLeaf(node)) {
      values.push(...node.keys);
      return;
    }
    if (kind === "bplus") {
      for (let i = 0; i < node.children.length; i += 1) {
        walk(node.children[i]);
      }
      return;
    }
    for (let i = 0; i < node.keys.length; i += 1) {
      walk(node.children[i] ?? null);
      values.push(node.keys[i]);
    }
    walk(node.children[node.keys.length] ?? null);
  };

  walk(tree);
  return values;
}

export function collectBLeaves(tree: BTree): BNode[] {
  const leaves: BNode[] = [];
  const walk = (node: BTree) => {
    if (!node) return;
    if (isLeaf(node)) {
      leaves.push(node);
      return;
    }
    for (const child of node.children) walk(child);
  };
  walk(tree);
  return leaves;
}

/* ------------------------------------------------------------------ */
/* Eventos estruturais                                                 */
/* ------------------------------------------------------------------ */

export type BTreeEventKind = "split" | "borrow" | "merge";

export interface BTreeEvent {
  kind: BTreeEventKind;
  snapshot: BTree;
  message: string;
  activeIds: NodeId[];
}

function sortedInsert(keys: number[], value: number): number[] {
  const index = lowerBound(keys, value);
  return [...keys.slice(0, index), value, ...keys.slice(index)];
}

/* ------------------------------------------------------------------ */
/* Inserção                                                            */
/* ------------------------------------------------------------------ */

export interface BInsertResult {
  tree: BTree;
  /** Árvore após colocar a chave na folha, antes de splits. */
  baseTree: BTree;
  baseOverflow: boolean;
  inserted: boolean;
  events: BTreeEvent[];
  nodeId: NodeId | null;
}

interface ChainEntry {
  node: BNode;
  index: number;
}

function rebuildChain(
  chain: ChainEntry[],
  upto: number,
  subtree: BTree,
  refresh = false,
): BTree {
  let current: BTree = subtree;
  for (let i = upto - 1; i >= 0; i -= 1) {
    const parent = chain[i].node;
    const children = [...parent.children];
    children[chain[i].index] = current as BNode;
    current = { ...parent, children };
    if (refresh) current = refreshBPlusKeys(current as BNode);
  }
  return current;
}

/**
 * No B+, todo separador deve ser igual ao menor valor da subárvore à direita.
 * Remoções e redistribuições podem mudar esse valor; recalcula os separadores
 * do nó a partir das folhas (idempotente para os demais).
 */
function refreshBPlusKeys(node: BNode): BNode {
  let changed = false;
  const keys = [...node.keys];

  for (let i = 0; i < keys.length; i += 1) {
    const child = node.children[i + 1];
    if (!child) continue;
    const min = minLeafValue(child);
    if (min === undefined || min === keys[i]) continue;
    keys[i] = min;
    changed = true;
  }

  return changed ? { ...node, keys } : node;
}

function nodeFromParts(
  source: BNode,
  keys: number[],
  children: BNode[],
  id: NodeId = source.id,
): BNode {
  return { id, keys, children };
}

function splitBNode(node: BNode): { left: BNode; promoted: number; right: BNode } {
  const mid = Math.floor(node.keys.length / 2);
  const internal = !isLeaf(node);
  const left = nodeFromParts(
    node,
    node.keys.slice(0, mid),
    internal ? node.children.slice(0, mid + 1) : [],
  );
  const right = nodeFromParts(
    node,
    node.keys.slice(mid + 1),
    internal ? node.children.slice(mid + 1) : [],
    newId(),
  );
  return { left, promoted: node.keys[mid], right };
}

function splitBPlusNode(node: BNode): { left: BNode; promoted: number; right: BNode } {
  if (isLeaf(node)) {
    const mid = Math.ceil(node.keys.length / 2);
    const left = nodeFromParts(node, node.keys.slice(0, mid), []);
    const right = nodeFromParts(node, node.keys.slice(mid), [], newId());
    return { left, promoted: right.keys[0], right };
  }

  const mid = Math.floor(node.keys.length / 2);
  const left = nodeFromParts(node, node.keys.slice(0, mid), node.children.slice(0, mid + 1));
  const right = nodeFromParts(
    node,
    node.keys.slice(mid + 1),
    node.children.slice(mid + 1),
    newId(),
  );
  return { left, promoted: node.keys[mid], right };
}

function redistribute(
  kind: MultiwayKind,
  leftKeys: number[],
  rightKeys: number[],
  separator: number,
  leftId: NodeId,
  rightId: NodeId,
  leftChildren: BNode[],
  rightChildren: BNode[],
  internal: boolean,
): { left: BNode; separator: number; right: BNode } {
  const combined = [...leftKeys, separator, ...rightKeys];
  const sepIndex = Math.floor((combined.length - 1) / 2);
  const separatorOut = combined[sepIndex];
  const left = {
    id: leftId,
    keys: combined.slice(0, sepIndex),
    children: internal ? leftChildren.slice(0, sepIndex + 1) : [],
  } as BNode;
  const right = {
    id: rightId,
    keys: combined.slice(sepIndex + 1),
    children: internal ? rightChildren.slice(0, 0) : [],
  } as BNode;

  if (internal) {
    const allChildren = [...leftChildren, ...rightChildren];
    left.children = allChildren.slice(0, sepIndex + 1);
    right.children = allChildren.slice(sepIndex + 1);
  }

  void kind;
  return { left, separator: separatorOut, right };
}

function splitIntoThree(
  sibling: BNode,
  separator: number,
  child: BNode,
  siblingBefore: boolean,
): { nodes: BNode[]; promoted: number[] } {
  const combined = [...sibling.keys, separator, ...child.keys];
  const allChildren = [...sibling.children, ...child.children];
  const internal = !isLeaf(sibling);

  const a = {
    id: siblingBefore ? sibling.id : child.id,
    keys: combined.slice(0, 2),
    children: internal ? allChildren.slice(0, 3) : [],
  } as BNode;
  const b = {
    id: newId(),
    keys: combined.slice(3, 5),
    children: internal ? allChildren.slice(3, 6) : [],
  } as BNode;
  const c = {
    id: siblingBefore ? child.id : sibling.id,
    keys: combined.slice(6, 8),
    children: internal ? allChildren.slice(6, 9) : [],
  } as BNode;

  return { nodes: [a, b, c], promoted: [combined[2], combined[5]] };
}

function rootSplit(kind: MultiwayKind, root: BNode): BNode {
  const { left, promoted, right } =
    kind === "bplus" ? splitBPlusNode(root) : splitBNode(root);
  return {
    id: newId(),
    keys: [promoted],
    children: [left, right],
  };
}

function resolveOverflow(
  kind: MultiwayKind,
  parent: BNode,
  index: number,
  child: BNode,
  chain: ChainEntry[],
  chainIndex: number,
  events: BTreeEvent[],
): BNode {
  if (kind === "bplus") {
    const { left, promoted, right } = splitBPlusNode(child);
    const keys = [...parent.keys];
    keys.splice(index, 0, promoted);
    const children = [...parent.children];
    children.splice(index, 1, left, right);
    const node = { ...parent, keys, children };
    events.push({
      kind: "split",
      snapshot: rebuildChain(chain, chainIndex, node, kind === "bplus"),
      message: isLeaf(child)
        ? `Folha cheia: "${child.keys.join(", ")}" foi dividida; ${promoted} subiu como separador.`
        : `Nó interno cheio dividido; ${promoted} subiu para o pai.`,
      activeIds: [left.id, right.id],
    });
    return node;
  }

  if (kind === "bstar") {
    const leftSibling = index > 0 ? parent.children[index - 1] : null;
    const rightSibling =
      index < parent.children.length - 1 ? parent.children[index + 1] : null;

    if (leftSibling && leftSibling.keys.length < BTREE_MAX_KEYS) {
      const base = redistribute(
        kind,
        leftSibling.keys,
        child.keys,
        parent.keys[index - 1],
        leftSibling.id,
        child.id,
        leftSibling.children,
        child.children,
        !isLeaf(child),
      );
      const keys = [...parent.keys];
      keys[index - 1] = base.separator;
      const children = [...parent.children];
      children[index - 1] = base.left;
      children[index] = base.right;
      const node = { ...parent, keys, children };
      events.push({
        kind: "borrow",
        snapshot: rebuildChain(chain, chainIndex, node, false),
        message: `B*: chave ${base.separator} redistribuída entre irmãos — sem criar nós.`,
        activeIds: [base.left.id, base.right.id],
      });
      return node;
    }

    if (rightSibling && rightSibling.keys.length < BTREE_MAX_KEYS) {
      const base = redistribute(
        kind,
        child.keys,
        rightSibling.keys,
        parent.keys[index],
        child.id,
        rightSibling.id,
        child.children,
        rightSibling.children,
        !isLeaf(child),
      );
      const keys = [...parent.keys];
      keys[index] = base.separator;
      const children = [...parent.children];
      children[index] = base.left;
      children[index + 1] = base.right;
      const node = { ...parent, keys, children };
      events.push({
        kind: "borrow",
        snapshot: rebuildChain(chain, chainIndex, node, false),
        message: `B*: chave ${base.separator} redistribuída entre irmãos — sem criar nós.`,
        activeIds: [base.left.id, base.right.id],
      });
      return node;
    }

    const sibling = leftSibling ?? rightSibling;
    if (!sibling) return parent;

    const siblingBefore = Boolean(leftSibling);
    const siblingIndex = siblingBefore ? index - 1 : index;
    const separatorIndex = siblingBefore ? index - 1 : index;
    const { nodes, promoted } = splitIntoThree(
      sibling,
      parent.keys[separatorIndex],
      child,
      siblingBefore,
    );
    const keys = [...parent.keys];
    keys.splice(separatorIndex, 1, ...promoted);
    const children = [...parent.children];
    children.splice(siblingIndex, 2, ...nodes);
    const node = { ...parent, keys, children };
    events.push({
      kind: "split",
      snapshot: rebuildChain(chain, chainIndex, node, false),
      message: `B*: divisão 2→3 criou três nós e promoveu ${promoted.join(" e ")}.`,
      activeIds: nodes.map((item) => item.id),
    });
    return node;
  }

  const { left, promoted, right } = splitBNode(child);
  const keys = [...parent.keys];
  keys.splice(index, 0, promoted);
  const children = [...parent.children];
  children.splice(index, 1, left, right);
  const node = { ...parent, keys, children };
  events.push({
    kind: "split",
    snapshot: rebuildChain(chain, chainIndex, node),
    message: `Nó cheio dividido; ${promoted} subiu para o pai.`,
    activeIds: [left.id, right.id],
  });
  return node;
}

export function insertB(tree: BTree, value: number, kind: MultiwayKind): BInsertResult {
  if (!tree) {
    const root = createBNode([value]);
    return {
      tree: root,
      baseTree: root,
      baseOverflow: false,
      inserted: true,
      events: [],
      nodeId: root.id,
    };
  }

  const chain: ChainEntry[] = [];
  let current = tree;

  while (!isLeaf(current)) {
    const index = childIndex(current, value, kind);
    if (kind !== "bplus" && current.keys[index] === value) {
      return {
        tree,
        baseTree: tree,
        baseOverflow: false,
        inserted: false,
        events: [],
        nodeId: current.id,
      };
    }
    chain.push({ node: current, index });
    current = current.children[index];
  }

  if (current.keys[lowerBound(current.keys, value)] === value) {
    return {
      tree,
      baseTree: tree,
      baseOverflow: false,
      inserted: false,
      events: [],
      nodeId: current.id,
    };
  }

  const leafKeys = sortedInsert(current.keys, value);
  let child = { ...current, keys: leafKeys };
  const baseOverflow = leafKeys.length > BTREE_MAX_KEYS;
  const baseTree = rebuildChain(chain, chain.length, child, kind === "bplus");
  const events: BTreeEvent[] = [];

  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const parent = chain[i].node;
    const children = [...parent.children];
    children[chain[i].index] = child;
    let node = { ...parent, children };

    if (child.keys.length > BTREE_MAX_KEYS) {
      node = resolveOverflow(
        kind,
        node,
        chain[i].index,
        child,
        chain,
        i,
        events,
      );
    }

    child = node;
  }

  if (child.keys.length > BTREE_MAX_KEYS) {
    child = rootSplit(kind, child);
    events.push({
      kind: "split",
      snapshot: child,
      message: `A raiz foi dividida; ${child.keys[0]} é a nova raiz.`,
      activeIds: [child.id],
    });
  }

  return {
    tree: child,
    baseTree,
    baseOverflow,
    inserted: true,
    events,
    nodeId: current.id,
  };
}

export function buildBTree(values: number[], kind: MultiwayKind): BTree {
  let tree: BTree = null;
  for (const value of values) {
    if (Number.isSafeInteger(value)) tree = insertB(tree, value, kind).tree;
  }
  return tree;
}

/* ------------------------------------------------------------------ */
/* Remoção                                                             */
/* ------------------------------------------------------------------ */

export interface BRemoveResult {
  tree: BTree;
  removed: boolean;
  target: BNode | null;
  events: BTreeEvent[];
}

function borrowFromLeft(
  parent: BNode,
  index: number,
  kind: MultiwayKind,
): { node: BNode; message: string; activeIds: NodeId[] } {
  const left = parent.children[index - 1];
  const child = parent.children[index];
  const keys = [...parent.keys];
  const leftKeys = [...left.keys];
  const childKeys = [...child.keys];
  const leftChildren = [...left.children];
  const childChildren = [...child.children];

  if (kind === "bplus" && isLeaf(child)) {
    childKeys.unshift(leftKeys.pop()!);
    keys[index - 1] = childKeys[0];
  } else {
    childKeys.unshift(keys[index - 1]);
    keys[index - 1] = leftKeys.pop()!;
    if (!isLeaf(child)) childChildren.unshift(leftChildren.pop()!);
  }

  const children = [...parent.children];
  children[index - 1] = { ...left, keys: leftKeys, children: leftChildren };
  children[index] = { ...child, keys: childKeys, children: childChildren };

  return {
    node: { ...parent, keys, children },
    message: `Empréstimo do irmão esquerdo para manter a ocupação mínima.`,
    activeIds: [left.id, child.id],
  };
}

function borrowFromRight(
  parent: BNode,
  index: number,
  kind: MultiwayKind,
): { node: BNode; message: string; activeIds: NodeId[] } {
  const child = parent.children[index];
  const right = parent.children[index + 1];
  const keys = [...parent.keys];
  const childKeys = [...child.keys];
  const rightKeys = [...right.keys];
  const childChildren = [...child.children];
  const rightChildren = [...right.children];

  if (kind === "bplus" && isLeaf(child)) {
    childKeys.push(rightKeys.shift()!);
    keys[index] = rightKeys[0];
  } else {
    childKeys.push(keys[index]);
    keys[index] = rightKeys.shift()!;
    if (!isLeaf(child)) childChildren.push(rightChildren.shift()!);
  }

  const children = [...parent.children];
  children[index] = { ...child, keys: childKeys, children: childChildren };
  children[index + 1] = { ...right, keys: rightKeys, children: rightChildren };

  return {
    node: { ...parent, keys, children },
    message: `Empréstimo do irmão direito para manter a ocupação mínima.`,
    activeIds: [child.id, right.id],
  };
}

function mergeWithLeft(
  parent: BNode,
  index: number,
  kind: MultiwayKind,
): { node: BNode; message: string; activeIds: NodeId[] } {
  const left = parent.children[index - 1];
  const child = parent.children[index];
  const keys = [...parent.keys];
  const children = [...parent.children];
  const leftKeys = [...left.keys];
  const leftChildren = [...left.children];

  if (kind === "bplus" && isLeaf(child)) {
    leftKeys.push(...child.keys);
  } else {
    leftKeys.push(keys[index - 1], ...child.keys);
    leftChildren.push(...child.children);
  }

  keys.splice(index - 1, 1);
  children.splice(index, 1);
  children[index - 1] = { ...left, keys: leftKeys, children: leftChildren };

  return {
    node: { ...parent, keys, children },
    message: `Nós mesclados com o irmão esquerdo; uma chave do pai desceu.`,
    activeIds: [left.id, child.id],
  };
}

function mergeWithRight(
  parent: BNode,
  index: number,
  kind: MultiwayKind,
): { node: BNode; message: string; activeIds: NodeId[] } {
  const child = parent.children[index];
  const right = parent.children[index + 1];
  const keys = [...parent.keys];
  const children = [...parent.children];
  const childKeys = [...child.keys];
  const childChildren = [...child.children];

  if (kind === "bplus" && isLeaf(child)) {
    childKeys.push(...right.keys);
  } else {
    childKeys.push(keys[index], ...right.keys);
    childChildren.push(...right.children);
  }

  keys.splice(index, 1);
  children.splice(index + 1, 1);
  children[index] = { ...child, keys: childKeys, children: childChildren };

  return {
    node: { ...parent, keys, children },
    message: `Nós mesclados com o irmão direito; uma chave do pai desceu.`,
    activeIds: [child.id, right.id],
  };
}

function fixUnderflow(
  parent: BNode,
  index: number,
  kind: MultiwayKind,
): { node: BNode; message: string; activeIds: NodeId[] } | null {
  const min = minKeysFor(kind);
  const child = parent.children[index];
  if (child.keys.length >= min) return null;

  const left = index > 0 ? parent.children[index - 1] : null;
  const right =
    index < parent.children.length - 1 ? parent.children[index + 1] : null;

  if (left && left.keys.length > min) return borrowFromLeft(parent, index, kind);
  if (right && right.keys.length > min) return borrowFromRight(parent, index, kind);
  if (left) return mergeWithLeft(parent, index, kind);
  if (right) return mergeWithRight(parent, index, kind);
  return null;
}

export function removeB(tree: BTree, value: number, kind: MultiwayKind): BRemoveResult {
  if (!tree) {
    return { tree: null, removed: false, target: null, events: [] };
  }

  const chain: ChainEntry[] = [];
  let current = tree;
  let found = false;
  let keyIndex = -1;

  while (current) {
    if (kind === "bplus") {
      if (isLeaf(current)) {
        const index = lowerBound(current.keys, value);
        found = current.keys[index] === value;
        keyIndex = index;
        break;
      }
      const index = upperBound(current.keys, value);
      chain.push({ node: current, index });
      current = current.children[index];
      continue;
    }

    const index = lowerBound(current.keys, value);
    if (current.keys[index] === value) {
      found = true;
      keyIndex = index;
      break;
    }
    if (isLeaf(current)) break;
    chain.push({ node: current, index });
    current = current.children[index];
  }

  if (!found) {
    return { tree, removed: false, target: null, events: [] };
  }

  let leaf: BNode;
  let workChain: ChainEntry[] = chain;
  const target: BNode = current;

  if (kind !== "bplus" && !isLeaf(current)) {
    const extra: ChainEntry[] = [];
    let predecessor = current.children[keyIndex];
    while (!isLeaf(predecessor)) {
      extra.push({ node: predecessor, index: predecessor.keys.length });
      predecessor = predecessor.children[predecessor.keys.length];
    }
    const predecessorValue = predecessor.keys[predecessor.keys.length - 1];
    const targetKeys = [...current.keys];
    targetKeys[keyIndex] = predecessorValue;
    const targetClone = { ...current, keys: targetKeys };
    workChain = [...chain, { node: targetClone, index: keyIndex }, ...extra];
    leaf = { ...predecessor, keys: predecessor.keys.slice(0, -1) };
  } else {
    leaf = { ...current, keys: current.keys.filter((_, index) => index !== keyIndex) };
  }

  const events: BTreeEvent[] = [];
  let child: BNode = leaf;

  for (let i = workChain.length - 1; i >= 0; i -= 1) {
    const parent = workChain[i].node;
    const children = [...parent.children];
    children[workChain[i].index] = child;
    let node = { ...parent, children };

    if (kind === "bplus") node = refreshBPlusKeys(node);

    const fixed = fixUnderflow(node, workChain[i].index, kind);
    if (fixed) node = fixed.node;
    if (kind === "bplus") node = refreshBPlusKeys(node);

    if (fixed) {
      events.push({
        kind: fixed.message.startsWith("Empréstimo") ? "borrow" : "merge",
        snapshot: rebuildChain(workChain, i, node, kind === "bplus"),
        message: fixed.message,
        activeIds: fixed.activeIds,
      });
    }

    child = node;
  }

  if (child.keys.length === 0) {
    let root: BTree = child;
    while (root && root.keys.length === 0) {
      root = root.children[0] ?? null;
    }
    return { tree: root, removed: true, target, events };
  }

  return { tree: child, removed: true, target, events };
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function validateNodeShape(
  node: unknown,
  ids: Set<string>,
  isRoot: boolean,
  kind: MultiwayKind,
): node is BNode {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    return false;
  }

  const candidate = node as Partial<BNode>;
  if (
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    ids.has(candidate.id)
  ) {
    return false;
  }
  if (!Array.isArray(candidate.keys) || !Array.isArray(candidate.children)) {
    return false;
  }

  const min = isRoot ? 1 : minKeysFor(kind);
  if (candidate.keys.length < min || candidate.keys.length > BTREE_MAX_KEYS) {
    return false;
  }

  for (let i = 0; i < candidate.keys.length; i += 1) {
    const key = candidate.keys[i];
    if (!isSafeInteger(key)) return false;
    if (i > 0 && key <= candidate.keys[i - 1]) return false;
  }

  if (candidate.children.length !== 0 && candidate.children.length !== candidate.keys.length + 1) {
    return false;
  }

  if (candidate.children.length > BTREE_ORDER) return false;
  ids.add(candidate.id);
  return true;
}

function validateBTreeNode(
  node: unknown,
  lower: number,
  upper: number,
  depth: number,
  isRoot: boolean,
  kind: MultiwayKind,
  ids: Set<string>,
  leafDepths: Set<number>,
): boolean {
  if (!validateNodeShape(node, ids, isRoot, kind)) return false;
  const current = node as BNode;

  for (const key of current.keys) {
    if (key <= lower || key >= upper) return false;
  }

  if (isLeaf(current)) {
    leafDepths.add(depth);
    return true;
  }

  for (let i = 0; i < current.children.length; i += 1) {
    const childLower = i === 0 ? lower : current.keys[i - 1];
    const childUpper = i === current.keys.length ? upper : current.keys[i];
    if (
      !validateBTreeNode(
        current.children[i],
        childLower,
        childUpper,
        depth + 1,
        false,
        kind,
        ids,
        leafDepths,
      )
    ) {
      return false;
    }
  }

  return true;
}

function minLeafValue(node: BNode): number | undefined {
  if (isLeaf(node)) return node.keys[0];
  return minLeafValue(node.children[0]);
}

function validateBPlusNode(
  node: unknown,
  depth: number,
  isRoot: boolean,
  ids: Set<string>,
  leafDepths: Set<number>,
  leafValues: number[],
): boolean {
  if (!validateNodeShape(node, ids, isRoot, "bplus")) return false;
  const current = node as BNode;

  if (isLeaf(current)) {
    leafDepths.add(depth);
    leafValues.push(...current.keys);
    return true;
  }

  for (let i = 0; i < current.children.length; i += 1) {
    if (!validateBPlusNode(current.children[i], depth + 1, false, ids, leafDepths, leafValues)) {
      return false;
    }
  }

  for (let i = 0; i < current.keys.length; i += 1) {
    if (minLeafValue(current.children[i + 1]) !== current.keys[i]) {
      return false;
    }
  }

  return true;
}

export function isValidBTree(value: unknown, kind: MultiwayKind): value is BTree {
  if (value === null) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();
  const leafDepths = new Set<number>();

  if (kind === "bplus") {
    const leafValues: number[] = [];
    if (
      !validateBPlusNode(value, 0, true, ids, leafDepths, leafValues)
    ) {
      return false;
    }
    if (leafDepths.size > 1) return false;
    for (let i = 1; i < leafValues.length; i += 1) {
      if (leafValues[i] <= leafValues[i - 1]) return false;
    }
    return true;
  }

  if (
    !validateBTreeNode(
      value,
      -Infinity,
      Infinity,
      0,
      true,
      kind,
      ids,
      leafDepths,
    )
  ) {
    return false;
  }

  return leafDepths.size === 1;
}
