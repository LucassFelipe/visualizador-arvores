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
