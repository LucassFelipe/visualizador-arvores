export type NodeId = string;

export interface TreeNode {
  id: NodeId;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

export type Tree = TreeNode | null;

export type TraversalOrder = "inorder" | "preorder" | "postorder" | "level";

export type StepKind =
  | "compare"
  | "visit"
  | "insert"
  | "remove"
  | "found"
  | "not-found"
  | "duplicate"
  | "done";

export interface Step {
  /** Snapshot imutável da árvore naquele instante. */
  tree: Tree;
  kind: StepKind;
  /** Nós em destaque forte (pulso). */
  activeIds: NodeId[];
  /** Caminho percorrido (raiz até o nó atual). */
  pathIds: NodeId[];
  /** Nós já visitados (usado nos percursos). */
  visitedIds: NodeId[];
  /** Sequência acumulada de valores (usado nos percursos). */
  output: number[];
  compare?: "left" | "right" | "equal";
  message: string;
}

export type OperationOutcome = "success" | "duplicate" | "not-found";

export interface OperationResult {
  steps: Step[];
  finalTree: Tree;
  outcome: OperationOutcome;
  title: string;
}

export interface Metrics {
  count: number;
  leaves: number;
  internal: number;
  height: number;
  min: number | null;
  max: number | null;
  root: number | null;
  avgDepth: number;
  balanced: boolean;
  rootBalance: number | null;
  valid: boolean;
}

export type NoticeTone = "info" | "success" | "error";

export interface Notice {
  tone: NoticeTone;
  text: string;
}

export interface Playback {
  steps: Step[];
  index: number;
  playing: boolean;
  speed: number;
  kind: "operation" | "traversal";
  title: string;
  order: TraversalOrder | null;
}
