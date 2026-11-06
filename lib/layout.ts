import { INORDER_GAP, NODE_RADIUS, NODE_SIZE, V_GAP } from "./constants";
import type { NodeId, Tree, TreeNode } from "./types";

export interface LayoutNode {
  id: NodeId;
  value: number;
  x: number;
  y: number;
  depth: number;
}

export interface LayoutEdge {
  id: string;
  parentId: NodeId;
  childId: NodeId;
  x: number;
  y: number;
  length: number;
  angle: number;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

/**
 * Layout em colunas por ordem simétrica:
 * cada nó recebe uma coluna fixa (x = índice em ordem) e a profundidade define y.
 * Isso garante que a ordem horizontal respeite a BST e que nós do mesmo nível
 * nunca se sobreponham — inclusive em árvores degeneradas.
 */
export function layoutTree(tree: Tree): TreeLayout {
  if (!tree) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const nodes: LayoutNode[] = [];
  let column = 0;

  const place = (node: TreeNode, depth: number) => {
    if (node.left) place(node.left, depth + 1);
    nodes.push({
      id: node.id,
      value: node.value,
      x: NODE_RADIUS + column * INORDER_GAP,
      y: depth * V_GAP + NODE_RADIUS,
      depth,
    });
    column += 1;
    if (node.right) place(node.right, depth + 1);
  };

  place(tree, 0);

  const positions = new Map(nodes.map((node) => [node.id, node]));
  const edges: LayoutEdge[] = [];

  const connect = (node: TreeNode) => {
    const parent = positions.get(node.id);
    if (!parent) return;

    const children: Array<[TreeNode | null, "left" | "right"]> = [
      [node.left, "left"],
      [node.right, "right"],
    ];

    for (const [child, side] of children) {
      if (!child) continue;
      const target = positions.get(child.id);
      if (!target) continue;

      const dx = target.x - parent.x;
      const dy = target.y - parent.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance;
      const uy = dy / distance;
      const padding = 2;
      const startX = parent.x + ux * (NODE_RADIUS + padding);
      const startY = parent.y + uy * (NODE_RADIUS + padding);
      const endX = target.x - ux * (NODE_RADIUS + padding);
      const endY = target.y - uy * (NODE_RADIUS + padding);

      edges.push({
        id: `${node.id}:${side}:${child.id}`,
        parentId: node.id,
        childId: child.id,
        x: startX,
        y: startY,
        length: Math.max(0, Math.hypot(endX - startX, endY - startY)),
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      });

      connect(child);
    }
  };

  connect(tree);

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
  const width = (nodes.length - 1) * INORDER_GAP + NODE_SIZE;

  return {
    nodes,
    edges,
    width,
    height: maxDepth * V_GAP + NODE_SIZE,
  };
}
