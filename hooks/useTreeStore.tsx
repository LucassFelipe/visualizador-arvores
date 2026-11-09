"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  BASE_STEP_DELAY,
  MAX_HISTORY,
  isMultiwayKind,
} from "@/lib/constants";
import { loadStoredState, saveStoredState } from "@/lib/persistence";
import type {
  BTree,
  BinaryKind,
  BinaryStructure,
  MultiwayKind,
  MultiwayStructure,
  Notice,
  Playback,
  Step,
  TraversalOrder,
  Tree,
  TreeKind,
} from "@/lib/types";

export interface AppState {
  kind: TreeKind;
  binary: Record<BinaryKind, BinaryStructure>;
  multiway: Record<MultiwayKind, MultiwayStructure>;
  playback: Playback | null;
  selectedId: string | null;
  editorMode: EditorMode;
  notice: Notice | null;
  hydrated: boolean;
  autoFit: boolean;
  speed: number;
}

export type EditorMode = "idle" | "edit" | "add-left" | "add-right";

export type AppAction =
  | {
      type: "hydrate";
      kind: TreeKind;
      binary: Record<BinaryKind, Tree>;
      multiway: Record<MultiwayKind, BTree>;
      restored: boolean;
    }
  | { type: "set-kind"; kind: TreeKind }
  | { type: "apply-binary"; tree: Tree; selectedId?: string | null; notice?: Notice }
  | {
      type: "apply-multiway";
      tree: BTree;
      selectedId?: string | null;
      notice?: Notice;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; id: string | null }
  | { type: "editor-mode"; mode: EditorMode }
  | { type: "notice"; notice: Notice | null }
  | {
      type: "start-playback";
      steps: Step[];
      title: string;
      kind: "operation" | "traversal";
      order: TraversalOrder | null;
      treeKind: TreeKind;
      commitBinary?: Tree;
      commitMultiway?: BTree;
    }
  | { type: "playback-index"; index: number }
  | { type: "playback-play" }
  | { type: "playback-pause" }
  | { type: "playback-next" }
  | { type: "playback-prev" }
  | { type: "playback-speed"; speed: number }
  | { type: "playback-close" }
  | { type: "set-autofit"; value: boolean };

const emptyBinary = (): BinaryStructure => ({ tree: null, past: [], future: [] });
const emptyMultiway = (): MultiwayStructure => ({ tree: null, past: [], future: [] });

const initialState: AppState = {
  kind: "bst",
  binary: { bst: emptyBinary(), avl: emptyBinary() },
  multiway: { b: emptyMultiway(), bstar: emptyMultiway(), bplus: emptyMultiway() },
  playback: null,
  selectedId: null,
  editorMode: "idle",
  notice: null,
  hydrated: false,
  autoFit: true,
  speed: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextHistory<T>(
  past: T[],
  future: T[],
  current: T,
  next: T,
): { past: T[]; future: T[] } {
  if (current === next) return { past, future };
  return { past: [current, ...past].slice(0, MAX_HISTORY), future: [] };
}

export function treeReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        kind: action.kind,
        binary: {
          bst: { tree: action.binary.bst, past: [], future: [] },
          avl: { tree: action.binary.avl, past: [], future: [] },
        },
        multiway: {
          b: { tree: action.multiway.b, past: [], future: [] },
          bstar: { tree: action.multiway.bstar, past: [], future: [] },
          bplus: { tree: action.multiway.bplus, past: [], future: [] },
        },
        hydrated: true,
        editorMode: "idle",
        notice: action.restored
          ? { tone: "info", text: "Estruturas restauradas do armazenamento local." }
          : null,
      };

    case "set-kind": {
      if (action.kind === state.kind) return state;
      return {
        ...state,
        kind: action.kind,
        playback: null,
        selectedId: null,
        editorMode: "idle",
        notice: null,
      };
    }

    case "apply-binary": {
      if (isMultiwayKind(state.kind)) return state;
      const binaryKind = state.kind as BinaryKind;
      const current = state.binary[binaryKind];
      if (current.tree === action.tree) {
        return {
          ...state,
          selectedId:
            action.selectedId === undefined ? null : action.selectedId,
          editorMode: "idle",
          notice: action.notice ?? state.notice,
        };
      }
      const history = nextHistory(current.past, current.future, current.tree, action.tree);
      return {
        ...state,
        binary: {
          ...state.binary,
          [binaryKind]: { tree: action.tree, ...history },
        },
        playback: null,
        selectedId: action.selectedId === undefined ? null : action.selectedId,
        editorMode: "idle",
        notice: action.notice ?? state.notice,
      };
    }

    case "apply-multiway": {
      if (!isMultiwayKind(state.kind)) return state;
      const multiwayKind = state.kind as MultiwayKind;
      const current = state.multiway[multiwayKind];
      if (current.tree === action.tree) {
        return {
          ...state,
          selectedId:
            action.selectedId === undefined ? null : action.selectedId,
          editorMode: "idle",
          notice: action.notice ?? state.notice,
        };
      }
      const history = nextHistory(current.past, current.future, current.tree, action.tree);
      return {
        ...state,
        multiway: {
          ...state.multiway,
          [multiwayKind]: { tree: action.tree, ...history },
        },
        playback: null,
        selectedId: action.selectedId === undefined ? null : action.selectedId,
        editorMode: "idle",
        notice: action.notice ?? state.notice,
      };
    }

    case "undo": {
      if (isMultiwayKind(state.kind)) {
        const kind = state.kind as MultiwayKind;
        const current = state.multiway[kind];
        if (current.past.length === 0) return state;
        const [previous, ...rest] = current.past;
        return {
          ...state,
          multiway: {
            ...state.multiway,
            [kind]: {
              tree: previous,
              past: rest,
              future: [current.tree, ...current.future].slice(0, MAX_HISTORY),
            },
          },
          playback: null,
          selectedId: null,
          editorMode: "idle",
          notice: { tone: "info", text: "Alteração desfeita." },
        };
      }

      const kind = state.kind as BinaryKind;
      const current = state.binary[kind];
      if (current.past.length === 0) return state;
      const [previous, ...rest] = current.past;
      return {
        ...state,
        binary: {
          ...state.binary,
          [kind]: {
            tree: previous,
            past: rest,
            future: [current.tree, ...current.future].slice(0, MAX_HISTORY),
          },
        },
        playback: null,
        selectedId: null,
        editorMode: "idle",
        notice: { tone: "info", text: "Alteração desfeita." },
      };
    }

    case "redo": {
      if (isMultiwayKind(state.kind)) {
        const kind = state.kind as MultiwayKind;
        const current = state.multiway[kind];
        if (current.future.length === 0) return state;
        const [next, ...rest] = current.future;
        return {
          ...state,
          multiway: {
            ...state.multiway,
            [kind]: {
              tree: next,
              past: [current.tree, ...current.past].slice(0, MAX_HISTORY),
              future: rest,
            },
          },
          playback: null,
          selectedId: null,
          editorMode: "idle",
          notice: { tone: "info", text: "Alteração refeita." },
        };
      }

      const kind = state.kind as BinaryKind;
      const current = state.binary[kind];
      if (current.future.length === 0) return state;
      const [next, ...rest] = current.future;
      return {
        ...state,
        binary: {
          ...state.binary,
          [kind]: {
            tree: next,
            past: [current.tree, ...current.past].slice(0, MAX_HISTORY),
            future: rest,
          },
        },
        playback: null,
        selectedId: null,
        editorMode: "idle",
        notice: { tone: "info", text: "Alteração refeita." },
      };
    }

    case "select":
      return { ...state, selectedId: action.id, editorMode: "idle" };

    case "editor-mode":
      return { ...state, editorMode: action.mode };

    case "notice":
      return { ...state, notice: action.notice };

    case "start-playback": {
      const multiway = isMultiwayKind(action.treeKind);
      const hasBinaryCommit = action.commitBinary !== undefined;
      const hasMultiwayCommit = action.commitMultiway !== undefined;
      const binaryKind = multiway ? null : (action.treeKind as BinaryKind);
      const multiwayKind = multiway ? (action.treeKind as MultiwayKind) : null;

      let binary = state.binary;
      let multiwayTrees = state.multiway;

      if (binaryKind && hasBinaryCommit) {
        const current = state.binary[binaryKind];
        const history = nextHistory(
          current.past,
          current.future,
          current.tree,
          action.commitBinary!,
        );
        binary = {
          ...state.binary,
          [binaryKind]: { tree: action.commitBinary!, ...history },
        };
      }

      if (multiwayKind && hasMultiwayCommit) {
        const current = state.multiway[multiwayKind];
        const history = nextHistory(
          current.past,
          current.future,
          current.tree,
          action.commitMultiway!,
        );
        multiwayTrees = {
          ...state.multiway,
          [multiwayKind]: { tree: action.commitMultiway!, ...history },
        };
      }

      return {
        ...state,
        binary,
        multiway: multiwayTrees,
        playback: {
          steps: action.steps,
          index: 0,
          playing: action.steps.length > 1,
          speed: state.speed,
          kind: action.kind,
          title: action.title,
          order: action.order,
          treeKind: action.treeKind,
        },
        selectedId: null,
        editorMode: "idle",
        notice: null,
      };
    }

    case "playback-index": {
      if (!state.playback) return state;
      const last = state.playback.steps.length - 1;
      return {
        ...state,
        playback: {
          ...state.playback,
          index: clamp(action.index, 0, last),
          playing: false,
        },
      };
    }

    case "playback-play": {
      if (!state.playback) return state;
      const last = state.playback.steps.length - 1;
      if (last <= 0) {
        return {
          ...state,
          playback: { ...state.playback, index: 0, playing: false },
        };
      }
      return {
        ...state,
        playback: {
          ...state.playback,
          index: state.playback.index >= last ? 0 : state.playback.index,
          playing: true,
        },
      };
    }

    case "playback-pause": {
      if (!state.playback) return state;
      return { ...state, playback: { ...state.playback, playing: false } };
    }

    case "playback-next": {
      if (!state.playback) return state;
      const last = state.playback.steps.length - 1;
      if (state.playback.index >= last) {
        return { ...state, playback: { ...state.playback, playing: false } };
      }
      const index = state.playback.index + 1;
      return {
        ...state,
        playback: { ...state.playback, index, playing: index < last },
      };
    }

    case "playback-prev": {
      if (!state.playback) return state;
      return {
        ...state,
        playback: {
          ...state.playback,
          index: Math.max(0, state.playback.index - 1),
          playing: false,
        },
      };
    }

    case "playback-speed": {
      const speed = clamp(action.speed, 0.25, 4);
      return {
        ...state,
        speed,
        playback: state.playback
          ? { ...state.playback, speed }
          : state.playback,
      };
    }

    case "playback-close":
      return { ...state, playback: null };

    case "set-autofit":
      return { ...state, autoFit: action.value };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Acessos derivados                                                   */
/* ------------------------------------------------------------------ */

export function currentBinary(state: AppState): BinaryStructure | null {
  return isMultiwayKind(state.kind)
    ? null
    : state.binary[state.kind as BinaryKind];
}

export function currentMultiway(state: AppState): MultiwayStructure | null {
  return isMultiwayKind(state.kind)
    ? state.multiway[state.kind as MultiwayKind]
    : null;
}

export function currentTree(state: AppState): Tree {
  return currentBinary(state)?.tree ?? null;
}

export function currentBTree(state: AppState): BTree {
  return currentMultiway(state)?.tree ?? null;
}

export function getDisplayedTree(state: AppState): Tree {
  if (!state.playback || isMultiwayKind(state.playback.treeKind)) {
    return currentTree(state);
  }
  const step = state.playback.steps[state.playback.index];
  return step ? step.tree : currentTree(state);
}

export function getDisplayedBTree(state: AppState): BTree {
  if (!state.playback || !isMultiwayKind(state.playback.treeKind)) {
    return currentBTree(state);
  }
  const step = state.playback.steps[state.playback.index];
  return step ? step.btree : currentBTree(state);
}

export function getCurrentStep(state: AppState): Step | null {
  if (!state.playback) return null;
  return state.playback.steps[state.playback.index] ?? null;
}

export function isCurrentTreeEmpty(state: AppState): boolean {
  return isMultiwayKind(state.kind) ? currentBTree(state) === null : currentTree(state) === null;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

interface TreeStoreValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const TreeStoreContext = createContext<TreeStoreValue | null>(null);

export function TreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(treeReducer, initialState);

  useEffect(() => {
    const stored = loadStoredState();
    dispatch({
      type: "hydrate",
      kind: stored?.kind ?? "bst",
      binary: stored?.binary ?? { bst: null, avl: null },
      multiway: stored?.multiway ?? { b: null, bstar: null, bplus: null },
      restored: stored !== null,
    });
  }, []);

  useEffect(() => {
    const playback = state.playback;
    if (!playback?.playing) return;

    if (playback.index >= playback.steps.length - 1) {
      dispatch({ type: "playback-pause" });
      return;
    }

    const delay = Math.max(140, BASE_STEP_DELAY / playback.speed);
    const timer = window.setTimeout(() => {
      dispatch({ type: "playback-next" });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [state.playback]);

  useEffect(() => {
    if (!state.notice) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "notice", notice: null });
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [state.notice]);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = window.setTimeout(() => {
      saveStoredState(
        state.kind,
        { bst: state.binary.bst.tree, avl: state.binary.avl.tree },
        {
          b: state.multiway.b.tree,
          bstar: state.multiway.bstar.tree,
          bplus: state.multiway.bplus.tree,
        },
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state.kind, state.binary, state.multiway, state.hydrated]);

  return (
    <TreeStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </TreeStoreContext.Provider>
  );
}

export function useTreeStore(): TreeStoreValue {
  const context = useContext(TreeStoreContext);
  if (!context) {
    throw new Error("useTreeStore precisa estar dentro de TreeProvider.");
  }
  return context;
}
