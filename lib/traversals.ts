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
