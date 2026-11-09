export type NodeId = string;

/* ------------------------------------------------------------------ */
/* Estruturas suportadas                                               */
/* ------------------------------------------------------------------ */

export type TreeKind = "bst" | "avl" | "b" | "bstar" | "bplus";
export type BinaryKind = "bst" | "avl";
export type MultiwayKind = "b" | "bstar" | "bplus";

/* ------------------------------------------------------------------ */
/* Árvore binária (BST e AVL)                                          */
/* ------------------------------------------------------------------ */

export interface TreeNode {
  id: NodeId;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

export type Tree = TreeNode | null;

/* ------------------------------------------------------------------ */
/* Árvore multi-chave (B, B* e B+)                                     */
/* ------------------------------------------------------------------ */

export interface BNode {
  id: NodeId;
  keys: number[];
  children: BNode[];
}

export type BTree = BNode | null;

/** Estado de uma estrutura binária: árvore + histórico próprio. */
export interface BinaryStructure {
  tree: Tree;
  past: Tree[];
  future: Tree[];
}

/** Estado de uma estrutura multi-chave: árvore + histórico próprio. */
export interface MultiwayStructure {
  tree: BTree;
  past: BTree[];
  future: BTree[];
}

/* ------------------------------------------------------------------ */
/* Percursos                                                           */
/* ------------------------------------------------------------------ */

export type TraversalOrder = "inorder" | "preorder" | "postorder" | "level";

/* ------------------------------------------------------------------ */
/* Passos e operações                                                  */
/* ------------------------------------------------------------------ */

export type StepKind =
  | "compare"
  | "visit"
  | "insert"
  | "remove"
  | "found"
  | "not-found"
  | "duplicate"
  | "rotate"
  | "split"
  | "merge"
  | "borrow"
  | "done";

export interface Step {
  /** Snapshot imutável da árvore binária naquele instante. */
  tree: Tree;
  /** Snapshot imutável da árvore multi-chave naquele instante. */
  btree: BTree;
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
  /** Modelo usado pela operação. */
  model: "binary" | "multiway";
  treeKind: TreeKind;
  steps: Step[];
  finalTree: Tree;
  finalBTree: BTree;
  outcome: OperationOutcome;
  title: string;
}

/* ------------------------------------------------------------------ */
/* Métricas                                                            */
/* ------------------------------------------------------------------ */

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

export interface MultiwayMetrics {
  /** Quantidade de nós (não de chaves). */
  nodes: number;
  /** Valores únicos armazenados (folhas no B+). */
  values: number;
  /** Chaves armazenadas, incluindo separadores copiados no B+. */
  keys: number;
  leaves: number;
  internal: number;
  height: number;
  min: number | null;
  max: number | null;
  root: number | null;
  avgDepth: number;
  balanced: boolean;
  minKeys: number;
  maxKeys: number;
  order: number;
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
  treeKind: TreeKind;
}
