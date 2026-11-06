"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { BASE_STEP_DELAY, MAX_HISTORY } from "@/lib/constants";
import { loadStoredTree, saveStoredTree } from "@/lib/persistence";
import type { Notice, Playback, Step, TraversalOrder, Tree } from "@/lib/types";

export interface AppState {
  tree: Tree;
  past: Tree[];
  future: Tree[];
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
  | { type: "hydrate"; tree: Tree; restored: boolean }
  | { type: "apply"; tree: Tree; selectedId?: string | null; notice?: Notice }
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
      commitTree?: Tree;
    }
  | { type: "playback-index"; index: number }
  | { type: "playback-play" }
  | { type: "playback-pause" }
  | { type: "playback-next" }
  | { type: "playback-prev" }
  | { type: "playback-speed"; speed: number }
  | { type: "playback-close" }
  | { type: "set-autofit"; value: boolean };

const initialState: AppState = {
  tree: null,
  past: [],
  future: [],
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

export function treeReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        tree: action.tree,
        hydrated: true,
        editorMode: "idle",
        notice: action.restored
          ? {
              tone: "info",
              text: "Árvore restaurada do armazenamento local.",
            }
          : null,
      };

    case "apply": {
      const changed = action.tree !== state.tree;
      return {
        ...state,
        tree: action.tree,
        past: changed
          ? [state.tree, ...state.past].slice(0, MAX_HISTORY)
          : state.past,
        future: changed ? [] : state.future,
        playback: null,
        selectedId:
          action.selectedId === undefined ? null : action.selectedId,
        editorMode: "idle",
        notice: action.notice ?? state.notice,
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      const [previous, ...rest] = state.past;
      return {
        ...state,
        tree: previous,
        past: rest,
        future: [state.tree, ...state.future].slice(0, MAX_HISTORY),
        playback: null,
        selectedId: null,
        editorMode: "idle",
        notice: { tone: "info", text: "Alteração desfeita." },
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        tree: next,
        past: [state.tree, ...state.past].slice(0, MAX_HISTORY),
        future: rest,
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
      const commit = action.commitTree;
      const hasCommit = commit !== undefined;
      const changed = hasCommit && commit !== state.tree;
      return {
        ...state,
        tree: hasCommit ? commit : state.tree,
        past: changed
          ? [state.tree, ...state.past].slice(0, MAX_HISTORY)
          : state.past,
        future: changed ? [] : state.future,
        playback: {
          steps: action.steps,
          index: 0,
          playing: action.steps.length > 1,
          speed: state.speed,
          kind: action.kind,
          title: action.title,
          order: action.order,
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
      return {
        ...state,
        playback: { ...state.playback, playing: false },
      };
    }

    case "playback-next": {
      if (!state.playback) return state;
      const last = state.playback.steps.length - 1;
      if (state.playback.index >= last) {
        return {
          ...state,
          playback: { ...state.playback, playing: false },
        };
      }
      const index = state.playback.index + 1;
      return {
        ...state,
        playback: {
          ...state.playback,
          index,
          playing: index < last,
        },
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

interface TreeStoreValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const TreeStoreContext = createContext<TreeStoreValue | null>(null);

export function TreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(treeReducer, initialState);

  useEffect(() => {
    const stored = loadStoredTree();
    dispatch({
      type: "hydrate",
      tree: stored,
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
      saveStoredTree(state.tree);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state.tree, state.hydrated]);

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

export function getDisplayedTree(state: AppState): Tree {
  if (!state.playback) return state.tree;
  const step = state.playback.steps[state.playback.index];
  return step ? step.tree : state.tree;
}

export function getCurrentStep(state: AppState): Step | null {
  if (!state.playback) return null;
  return state.playback.steps[state.playback.index] ?? null;
}
