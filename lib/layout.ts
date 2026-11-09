import {
  B_H_GAP,
  B_KEY_WIDTH,
  B_NODE_HEIGHT,
  B_NODE_PADDING,
  B_V_GAP,
  INORDER_GAP,
  NODE_RADIUS,
  NODE_SIZE,
  V_GAP,
} from "./constants";
import type { BNode, BTree, MultiwayKind, NodeId, Tree, TreeNode } from "./types";

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
  variant?: "tree" | "leaf-link";
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export interface LayoutBNode {
  id: NodeId;
  keys: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  leaf: boolean;
}

export interface MultiwayLayout {
  nodes: LayoutBNode[];
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

/* ------------------------------------------------------------------ */
/* Layout multi-chave (B, B* e B+)                                     */
/* ------------------------------------------------------------------ */

function bNodeWidth(node: BNode): number {
  return Math.max(
    B_KEY_WIDTH + B_NODE_PADDING * 2,
    node.keys.length * B_KEY_WIDTH + B_NODE_PADDING * 2,
  );
}

interface Point {
  x: number;
  y: number;
}

function trimEdge(
  center: Point,
  halfWidth: number,
  halfHeight: number,
  ux: number,
  uy: number,
  padding: number,
): Point {
  const tx = Math.abs(ux) < 1e-6 ? Infinity : halfWidth / Math.abs(ux);
  const ty = Math.abs(uy) < 1e-6 ? Infinity : halfHeight / Math.abs(uy);
  const distance = Math.min(tx, ty) + padding;
  return {
    x: center.x + ux * distance,
    y: center.y + uy * distance,
  };
}

export function layoutBTree(tree: BTree, kind: MultiwayKind): MultiwayLayout {
  if (!tree) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const widths = new Map<NodeId, number>();

  const measure = (node: BNode): number => {
    const cached = widths.get(node.id);
    if (cached !== undefined) return cached;

    const own = bNodeWidth(node);
    if (node.children.length === 0) {
      widths.set(node.id, own);
      return own;
    }

    const childrenWidth =
      node.children.reduce((sum, child) => sum + measure(child), 0) +
      B_H_GAP * (node.children.length - 1);
    const width = Math.max(own, childrenWidth);
    widths.set(node.id, width);
    return width;
  };

  const nodes: LayoutBNode[] = [];
  const leaves: LayoutBNode[] = [];

  const place = (node: BNode, left: number, depth: number) => {
    const width = widths.get(node.id) ?? measure(node);
    const centerX = left + width / 2;
    const layoutNode: LayoutBNode = {
      id: node.id,
      keys: node.keys,
      x: centerX,
      y: depth * B_V_GAP + B_NODE_HEIGHT / 2,
      width: bNodeWidth(node),
      height: B_NODE_HEIGHT,
      depth,
      leaf: node.children.length === 0,
    };
    nodes.push(layoutNode);
    if (layoutNode.leaf) leaves.push(layoutNode);

    if (node.children.length === 0) return;

    const totalChildren =
      node.children.reduce((sum, child) => sum + measure(child), 0) +
      B_H_GAP * (node.children.length - 1);
    let cursor = left + (width - totalChildren) / 2;

    for (const child of node.children) {
      const childWidth = measure(child);
      place(child, cursor, depth + 1);
      cursor += childWidth + B_H_GAP;
    }
  };

  measure(tree);
  place(tree, 0, 0);

  const positions = new Map(nodes.map((node) => [node.id, node]));
  const edges: LayoutEdge[] = [];

  const connect = (node: BNode) => {
    const parent = positions.get(node.id);
    if (!parent) return;

    for (const child of node.children) {
      const target = positions.get(child.id);
      if (!target) continue;

      const dx = target.x - parent.x;
      const dy = target.y - parent.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance;
      const uy = dy / distance;
      const start = trimEdge(
        parent,
        parent.width / 2,
        parent.height / 2,
        ux,
        uy,
        3,
      );
      const end = trimEdge(target, target.width / 2, target.height / 2, -ux, -uy, 3);

      edges.push({
        id: `${node.id}:${child.id}`,
        parentId: node.id,
        childId: child.id,
        x: start.x,
        y: start.y,
        length: Math.max(0, Math.hypot(end.x - start.x, end.y - start.y)),
        angle: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
        variant: "tree",
      });

      connect(child);
    }
  };

  connect(tree);

  // Apenas a B+ encadeia as folhas; B e B* não têm essa ligação.
  if (kind === "bplus") {
    for (let i = 1; i < leaves.length; i += 1) {
      const previous = leaves[i - 1];
      const current = leaves[i];
      const startX = previous.x + previous.width / 2;
      const endX = current.x - current.width / 2;
      if (endX <= startX) continue;
      edges.push({
        id: `leaf-link:${previous.id}:${current.id}`,
        parentId: previous.id,
        childId: current.id,
        x: startX,
        y: previous.y,
        length: endX - startX,
        angle: 0,
        variant: "leaf-link",
      });
    }
  }

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    nodes,
    edges,
    width: widths.get(tree.id) ?? 0,
    height: maxDepth * B_V_GAP + B_NODE_HEIGHT,
  };
}
