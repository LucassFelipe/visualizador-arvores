export const NODE_SIZE = 54;
export const NODE_RADIUS = NODE_SIZE / 2;
export const INORDER_GAP = NODE_SIZE + 18;
export const V_GAP = 92;

export const MAX_HISTORY = 50;
export const STORAGE_KEY = "arvore-binaria:v1";
export const STORAGE_VERSION = 1;

export const BASE_STEP_DELAY = 880;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.4;

export const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3] as const;

export const TRAVERSAL_LABELS = {
  inorder: "Em ordem",
  preorder: "Pré-ordem",
  postorder: "Pós-ordem",
  level: "Em nível",
} as const;

export const TRAVERSAL_SHORT = {
  inorder: "E",
  preorder: "Pré",
  postorder: "Pós",
  level: "N",
} as const;
