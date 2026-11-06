import { buildTree } from "./bst";
import type { Tree } from "./types";

export const SAMPLE_VALUES = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65, 85];

export function buildSampleTree(): Tree {
  return buildTree(SAMPLE_VALUES);
}
