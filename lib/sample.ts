import { buildAvlTree } from "./avl";
import { buildBTree } from "./btree";
import { buildTree } from "./bst";
import type { BTree, MultiwayKind, Tree, TreeKind } from "./types";

export const SAMPLE_VALUES = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65, 85];

export function buildSampleTree(): Tree {
  return buildTree(SAMPLE_VALUES);
}

export function buildSampleAvlTree(): Tree {
  return buildAvlTree(SAMPLE_VALUES);
}

export function buildSampleBTree(kind: MultiwayKind): BTree {
  return buildBTree(SAMPLE_VALUES, kind);
}

export function buildSampleForKind(kind: TreeKind): Tree | BTree {
  if (kind === "bst") return buildSampleTree();
  if (kind === "avl") return buildSampleAvlTree();
  return buildSampleBTree(kind);
}
