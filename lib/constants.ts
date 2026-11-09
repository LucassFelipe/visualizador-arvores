import type { MultiwayKind, TreeKind, TraversalOrder } from "./types";

export const NODE_SIZE = 54;
export const NODE_RADIUS = NODE_SIZE / 2;
export const INORDER_GAP = NODE_SIZE + 18;
export const V_GAP = 92;

/* ------------------------------------------------------------------ */
/* Árvores multi-chave                                                 */
/* ------------------------------------------------------------------ */

export const BTREE_ORDER = 4;
export const BTREE_MAX_KEYS = BTREE_ORDER - 1;
export const BTREE_MIN_KEYS = Math.ceil(BTREE_ORDER / 2) - 1;
export const BSTAR_MIN_KEYS = 1;
export const BPLUS_MIN_KEYS = Math.ceil(BTREE_ORDER / 2) - 1;

export const B_KEY_WIDTH = 42;
export const B_NODE_PADDING = 9;
export const B_NODE_HEIGHT = 48;
export const B_H_GAP = 26;
export const B_V_GAP = 106;

/* ------------------------------------------------------------------ */
/* Metadados das estruturas                                            */
/* ------------------------------------------------------------------ */

export const TREE_KINDS: TreeKind[] = ["bst", "avl", "b", "bstar", "bplus"];

export interface KindInfo {
  label: string;
  short: string;
  description: string;
  multiway: boolean;
}

export const KIND_INFO: Record<TreeKind, KindInfo> = {
  bst: {
    label: "BST",
    short: "BST",
    description: "Árvore binária de busca",
    multiway: false,
  },
  avl: {
    label: "AVL",
    short: "AVL",
    description: "Árvore binária balanceada",
    multiway: false,
  },
  b: {
    label: "B",
    short: "B",
    description: "Árvore B de ordem 4",
    multiway: true,
  },
  bstar: {
    label: "B*",
    short: "B*",
    description: "Árvore B* de ordem 4",
    multiway: true,
  },
  bplus: {
    label: "B+",
    short: "B+",
    description: "Árvore B+ de ordem 4",
    multiway: true,
  },
};

export function isMultiwayKind(kind: TreeKind): kind is MultiwayKind {
  return KIND_INFO[kind].multiway;
}

/* ------------------------------------------------------------------ */
/* Histórico e persistência                                            */
/* ------------------------------------------------------------------ */

export const MAX_HISTORY = 50;
export const STORAGE_KEY = "arvore-binaria:v2";
export const STORAGE_KEY_LEGACY = "arvore-binaria:v1";
export const STORAGE_VERSION = 2;

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

export const BASE_STEP_DELAY = 880;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.4;

export const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3] as const;

/* ------------------------------------------------------------------ */
/* Percursos                                                           */
/* ------------------------------------------------------------------ */

export const TRAVERSAL_LABELS: Record<TraversalOrder, string> = {
  inorder: "Em ordem",
  preorder: "Pré-ordem",
  postorder: "Pós-ordem",
  level: "Em nível",
};

export const TRAVERSAL_SHORT: Record<TraversalOrder, string> = {
  inorder: "E",
  preorder: "Pré",
  postorder: "Pós",
  level: "N",
};

export const BPLUS_TRAVERSAL_LABELS: Record<TraversalOrder, string> = {
  inorder: "Folhas",
  preorder: "Pré-ordem",
  postorder: "Pós-ordem",
  level: "Em nível",
};

export const BPLUS_TRAVERSAL_SHORT: Record<TraversalOrder, string> = {
  inorder: "F",
  preorder: "Pré",
  postorder: "Pós",
  level: "N",
};

export function traversalLabels(kind: TreeKind) {
  return kind === "bplus" ? BPLUS_TRAVERSAL_LABELS : TRAVERSAL_LABELS;
}

export function traversalShort(kind: TreeKind) {
  return kind === "bplus" ? BPLUS_TRAVERSAL_SHORT : TRAVERSAL_SHORT;
}
