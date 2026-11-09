import { isValidTree } from "./bst";
import type { Metrics, Tree } from "./types";

export function computeMetrics(tree: Tree): Metrics {
  let count = 0;
  let leaves = 0;
  let internal = 0;
  let sumDepth = 0;
  let min = Infinity;
  let max = -Infinity;
  let balanced = true;
  let rootBalance: number | null = null;

  function analyze(node: Tree, depth: number): number {
    if (!node) return 0;

    count += 1;
    sumDepth += depth;
    if (node.value < min) min = node.value;
    if (node.value > max) max = node.value;

    const leftHeight = analyze(node.left, depth + 1);
    const rightHeight = analyze(node.right, depth + 1);

    if (!node.left && !node.right) leaves += 1;
    else internal += 1;

    if (Math.abs(leftHeight - rightHeight) > 1) balanced = false;
    if (depth === 0) rootBalance = leftHeight - rightHeight;

    return 1 + Math.max(leftHeight, rightHeight);
  }

  const height = analyze(tree, 0);

  return {
    count,
    leaves,
    internal,
    height,
    min: count === 0 ? null : min,
    max: count === 0 ? null : max,
    root: tree ? tree.value : null,
    avgDepth: count === 0 ? 0 : sumDepth / count,
    balanced,
    rootBalance,
    valid: isValidTree(tree),
  };
}

import { isValidBTree } from "./btree";
import { BTREE_ORDER } from "./constants";
import type { BTree, MultiwayKind, MultiwayMetrics } from "./types";

export function computeBTreeMetrics(
  tree: BTree,
  kind: MultiwayKind,
): MultiwayMetrics {
  let nodes = 0;
  let values = 0;
  let keys = 0;
  let leaves = 0;
  let internal = 0;
  let maxDepth = -1;
  let sumWeightedDepth = 0;
  let min = Infinity;
  let max = -Infinity;
  let minObservedKeys = Infinity;
  let maxObservedKeys = 0;
  const leafDepths = new Set<number>();

  function analyze(node: BTree, depth: number): void {
    if (!node) return;

    nodes += 1;
    keys += node.keys.length;
    minObservedKeys = Math.min(minObservedKeys, node.keys.length);
    maxObservedKeys = Math.max(maxObservedKeys, node.keys.length);

    const isLeafNode = node.children.length === 0;
    if (isLeafNode) {
      leaves += 1;
      leafDepths.add(depth);
      if (kind === "bplus") {
        values += node.keys.length;
        sumWeightedDepth += depth * node.keys.length;
      }
    } else {
      internal += 1;
    }

    if (kind !== "bplus" || isLeafNode) {
      for (const key of node.keys) {
        if (key < min) min = key;
        if (key > max) max = key;
      }
      if (kind !== "bplus") sumWeightedDepth += depth * node.keys.length;
    }

    maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children) analyze(child, depth + 1);
  }

  analyze(tree, 0);

  if (kind !== "bplus" && nodes > 0) {
    values = keys;
  }

  return {
    nodes,
    values,
    keys,
    leaves,
    internal,
    height: nodes === 0 ? 0 : maxDepth + 1,
    min: values === 0 ? null : min,
    max: values === 0 ? null : max,
    root: tree ? tree.keys[0] : null,
    avgDepth: values === 0 ? 0 : sumWeightedDepth / values,
    balanced: leafDepths.size <= 1,
    minKeys: nodes === 0 ? 0 : minObservedKeys,
    maxKeys: maxObservedKeys,
    order: BTREE_ORDER,
    valid: isValidBTree(tree, kind),
  };
}
