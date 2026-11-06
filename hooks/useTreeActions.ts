"use client";

import {
  addChildValue,
  editNodeValue,
  findNodeById,
  remove,
} from "@/lib/bst";
import {
  insertOperation,
  removeOperation,
  searchOperation,
  traversalOperation,
} from "@/lib/operations";
import { buildSampleTree } from "@/lib/sample";
import type { NoticeTone, TraversalOrder, Tree } from "@/lib/types";
import {
  getCurrentStep,
  getDisplayedTree,
  useTreeStore,
} from "./useTreeStore";

export function parseInteger(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return null;
  if (Math.abs(value) >= 1_000_000) return null;
  return value;
}

export function useTreeActions() {
  const { state, dispatch } = useTreeStore();
  const isBusy = state.playback !== null;
  const selectedNode = findNodeById(state.tree, state.selectedId);
  const displayedTree = getDisplayedTree(state);
  const currentStep = getCurrentStep(state);

  const notify = (tone: NoticeTone, text: string) => {
    dispatch({ type: "notice", notice: { tone, text } });
  };

  const dismissNotice = () => {
    dispatch({ type: "notice", notice: null });
  };

  const insert = (value: number) => {
    if (isBusy) return;
    const operation = insertOperation(state.tree, value);
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "operation",
      order: null,
      commitTree:
        operation.outcome === "success" ? operation.finalTree : undefined,
    });
  };

  const search = (value: number) => {
    if (isBusy) return;
    const operation = searchOperation(state.tree, value);
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "operation",
      order: null,
    });
  };

  const removeValue = (value: number) => {
    if (isBusy) return;
    const operation = removeOperation(state.tree, value);
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "operation",
      order: null,
      commitTree:
        operation.outcome === "success" ? operation.finalTree : undefined,
    });
  };

  const traverse = (order: TraversalOrder) => {
    if (state.playback?.kind === "operation") return;
    const operation = traversalOperation(state.tree, order);
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "traversal",
      order,
    });
  };

  const select = (id: string | null) => {
    if (isBusy) return;
    dispatch({ type: "select", id });
  };

  const beginEdit = (id: string) => {
    if (isBusy) return;
    dispatch({ type: "select", id });
    dispatch({ type: "editor-mode", mode: "edit" });
  };

  const beginAdd = (id: string, side: "left" | "right") => {
    if (isBusy) return;
    dispatch({ type: "select", id });
    dispatch({
      type: "editor-mode",
      mode: side === "left" ? "add-left" : "add-right",
    });
  };

  const closeEditor = () => {
    dispatch({ type: "editor-mode", mode: "idle" });
  };

  const editSelected = (newValue: number) => {
    if (isBusy) return;
    if (!selectedNode) {
      notify("error", "Selecione um nó para editar.");
      return;
    }
    const result = editNodeValue(state.tree, selectedNode.id, newValue);
    if (result.error) {
      notify("error", result.error);
      return;
    }
    dispatch({
      type: "apply",
      tree: result.tree,
      selectedId: selectedNode.id,
      notice: {
        tone: "success",
        text: `Subárvore de ${selectedNode.value} reconstruída com o valor ${newValue}.`,
      },
    });
  };

  const addChild = (side: "left" | "right", value: number) => {
    if (isBusy) return;
    if (!selectedNode) {
      notify("error", "Selecione um nó para adicionar um filho.");
      return;
    }
    const result = addChildValue(state.tree, selectedNode.id, side, value);
    if (result.error) {
      notify("error", result.error);
      return;
    }
    dispatch({
      type: "apply",
      tree: result.tree,
      selectedId: result.nodeId,
      notice: {
        tone: "success",
        text: `Nó ${value} adicionado à ${side === "left" ? "esquerda" : "direita"} de ${selectedNode.value}.`,
      },
    });
  };

  const removeSelected = () => {
    if (isBusy) return;
    if (!selectedNode) return;
    const result = remove(state.tree, selectedNode.value);
    if (!result.removed) {
      notify("error", "Nó não encontrado.");
      return;
    }
    dispatch({
      type: "apply",
      tree: result.tree,
      selectedId: null,
      notice: { tone: "success", text: `Nó ${selectedNode.value} removido.` },
    });
  };

  const clearTree = () => {
    if (isBusy || state.tree === null) return;
    dispatch({
      type: "apply",
      tree: null,
      selectedId: null,
      notice: {
        tone: "info",
        text: "Árvore limpa. Use Ctrl+Z para desfazer.",
      },
    });
  };

  const loadSample = () => {
    if (isBusy) return;
    dispatch({
      type: "apply",
      tree: buildSampleTree(),
      selectedId: null,
      notice: { tone: "success", text: "Árvore de exemplo carregada." },
    });
  };

  const undo = () => {
    if (isBusy) return;
    dispatch({ type: "undo" });
  };

  const redo = () => {
    if (isBusy) return;
    dispatch({ type: "redo" });
  };

  const setSpeed = (speed: number) => {
    dispatch({ type: "playback-speed", speed });
  };

  const closePlayback = () => {
    dispatch({ type: "playback-close" });
  };

  const setIndex = (index: number) => {
    dispatch({ type: "playback-index", index });
  };

  const play = () => dispatch({ type: "playback-play" });
  const pause = () => dispatch({ type: "playback-pause" });
  const next = () => dispatch({ type: "playback-next" });
  const prev = () => dispatch({ type: "playback-prev" });

  const setAutoFit = (value: boolean) => {
    dispatch({ type: "set-autofit", value });
  };

  return {
    state,
    isBusy,
    selectedNode,
    displayedTree,
    currentStep,
    canUndo: state.past.length > 0 && !isBusy,
    canRedo: state.future.length > 0 && !isBusy,
    insert,
    search,
    removeValue,
    traverse,
    select,
    beginEdit,
    beginAdd,
    closeEditor,
    editSelected,
    addChild,
    removeSelected,
    clearTree,
    loadSample,
    undo,
    redo,
    notify,
    dismissNotice,
    setSpeed,
    closePlayback,
    setIndex,
    play,
    pause,
    next,
    prev,
    setAutoFit,
    applyTree: (tree: Tree) =>
      dispatch({ type: "apply", tree, selectedId: null }),
  };
}
