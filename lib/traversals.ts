import type { NodeId, TraversalOrder, Tree } from "./types";

export interface TraversalVisit {
  id: NodeId;
  value: number;
  depth: number;
}

export function traverse(tree: Tree, order: TraversalOrder): TraversalVisit[] {
  const visits: TraversalVisit[] = [];

  if (order === "level") {
    const queue: Array<{ node: Tree; depth: number }> = [{ node: tree, depth: 0 }];
    let head = 0;
    while (head < queue.length) {
      const { node, depth } = queue[head];
      head += 1;
      if (!node) continue;
      visits.push({ id: node.id, value: node.value, depth });
      if (node.left) queue.push({ node: node.left, depth: depth + 1 });
      if (node.right) queue.push({ node: node.right, depth: depth + 1 });
    }
    return visits;
  }

  const walk = (node: Tree, depth: number) => {
    if (!node) return;
    if (order === "preorder") {
      visits.push({ id: node.id, value: node.value, depth });
    }
    walk(node.left, depth + 1);
    if (order === "inorder") {
      visits.push({ id: node.id, value: node.value, depth });
    }
    walk(node.right, depth + 1);
    if (order === "postorder") {
      visits.push({ id: node.id, value: node.value, depth });
    }
  };

  walk(tree, 0);
  return visits;
}

import { isLeaf } from "./btree";
import type { BTree, MultiwayKind } from "./types";

export function traverseB(
  tree: BTree,
  order: TraversalOrder,
  kind: MultiwayKind,
): TraversalVisit[] {
  const visits: TraversalVisit[] = [];

  if (order === "level") {
    const queue: Array<{ node: BTree; depth: number }> = [{ node: tree, depth: 0 }];
    let head = 0;
    while (head < queue.length) {
      const { node, depth } = queue[head];
      head += 1;
      if (!node) continue;
      for (const key of node.keys) {
        visits.push({ id: node.id, value: key, depth });
      }
      for (const child of node.children) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }
    return visits;
  }

  if (kind === "bplus" && order === "inorder") {
    const walk = (node: BTree, depth: number) => {
      if (!node) return;
      if (isLeaf(node)) {
        for (const key of node.keys) {
          visits.push({ id: node.id, value: key, depth });
        }
        return;
      }
      for (const child of node.children) walk(child, depth + 1);
    };
    walk(tree, 0);
    return visits;
  }

  const walk = (node: BTree, depth: number) => {
    if (!node) return;

    if (order === "preorder") {
      for (const key of node.keys) {
        visits.push({ id: node.id, value: key, depth });
      }
    }

    if (order === "inorder") {
      for (let i = 0; i < node.keys.length; i += 1) {
        walk(node.children[i] ?? null, depth + 1);
        visits.push({ id: node.id, value: node.keys[i], depth });
      }
      walk(node.children[node.keys.length] ?? null, depth + 1);
      return;
    }

    for (const child of node.children) walk(child, depth + 1);

    if (order === "postorder") {
      for (const key of node.keys) {
        visits.push({ id: node.id, value: key, depth });
      }
    }
  };

  walk(tree, 0);
  return visits;
}
