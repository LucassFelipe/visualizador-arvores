"use client";

import { addAvlChildValue, editAvlNodeValue, removeAvl } from "@/lib/avl";
import { findBNodeById } from "@/lib/btree";
import {
  addChildValue,
  editNodeValue,
  findNodeById,
  remove,
} from "@/lib/bst";
import {
  insertForKind,
  removeForKind,
  searchForKind,
  traversalForKind,
} from "@/lib/operations";
import { buildSampleAvlTree, buildSampleBTree, buildSampleTree } from "@/lib/sample";
import type {
  BTree,
  NoticeTone,
  TraversalOrder,
  Tree,
  TreeKind,
} from "@/lib/types";
import {
  currentBTree,
  currentBinary,
  currentMultiway,
  currentTree,
  getCurrentStep,
  getDisplayedBTree,
  getDisplayedTree,
  isCurrentTreeEmpty,
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
  const binary = currentBinary(state);
  const multiway = currentMultiway(state);
  const tree = currentTree(state);
  const btree = currentBTree(state);
  const selectedNode = findNodeById(tree, state.selectedId);
  const selectedBNode = findBNodeById(btree, state.selectedId);
  const displayedTree = getDisplayedTree(state);
  const displayedBTree = getDisplayedBTree(state);
  const currentStep = getCurrentStep(state);

  const notify = (tone: NoticeTone, text: string) => {
    dispatch({ type: "notice", notice: { tone, text } });
  };

  const dismissNotice = () => {
    dispatch({ type: "notice", notice: null });
  };

  const startOperation = (
    operation: ReturnType<typeof insertForKind>,
  ) => {
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "operation",
      order: null,
      treeKind: operation.treeKind,
      commitBinary:
        operation.model === "binary" && operation.outcome === "success"
          ? operation.finalTree
          : undefined,
      commitMultiway:
        operation.model === "multiway" && operation.outcome === "success"
          ? operation.finalBTree
          : undefined,
    });
  };

  const insert = (value: number) => {
    if (isBusy) return;
    startOperation(insertForKind(state.kind, tree, btree, value));
  };

  const search = (value: number) => {
    if (isBusy) return;
    startOperation(searchForKind(state.kind, tree, btree, value));
  };

  const removeValue = (value: number) => {
    if (isBusy) return;
    startOperation(removeForKind(state.kind, tree, btree, value));
  };

  const traverse = (order: TraversalOrder) => {
    if (state.playback?.kind === "operation") return;
    const operation = traversalForKind(state.kind, tree, btree, order);
    dispatch({
      type: "start-playback",
      steps: operation.steps,
      title: operation.title,
      kind: "traversal",
      order,
      treeKind: state.kind,
    });
  };

  const setKind = (kind: TreeKind) => {
    if (isBusy || kind === state.kind) return;
    dispatch({ type: "set-kind", kind });
  };

  const select = (id: string | null) => {
    if (isBusy) return;
    dispatch({ type: "select", id });
  };

  const beginEdit = (id: string) => {
    if (isBusy || state.kind === "b" || state.kind === "bstar" || state.kind === "bplus") {
      return;
    }
    dispatch({ type: "select", id });
    dispatch({ type: "editor-mode", mode: "edit" });
  };

  const beginAdd = (id: string, side: "left" | "right") => {
    if (isBusy || state.kind === "b" || state.kind === "bstar" || state.kind === "bplus") {
      return;
    }
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

    const result =
      state.kind === "avl"
        ? editAvlNodeValue(tree, selectedNode.id, newValue)
        : editNodeValue(tree, selectedNode.id, newValue);

    if (result.error) {
      notify("error", result.error);
      return;
    }

    dispatch({
      type: "apply-binary",
      tree: result.tree,
      selectedId: selectedNode.id,
      notice: {
        tone: "success",
        text:
          state.kind === "avl"
            ? `Subárvore de ${selectedNode.value} rebalanceada com o valor ${newValue}.`
            : `Subárvore de ${selectedNode.value} reconstruída com o valor ${newValue}.`,
      },
    });
  };

  const addChild = (side: "left" | "right", value: number) => {
    if (isBusy) return;
    if (!selectedNode) {
      notify("error", "Selecione um nó para adicionar um filho.");
      return;
    }

    const result =
      state.kind === "avl"
        ? addAvlChildValue(tree, selectedNode.id, side, value)
        : addChildValue(tree, selectedNode.id, side, value);

    if (result.error) {
      notify("error", result.error);
      return;
    }

    dispatch({
      type: "apply-binary",
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
    const result =
      state.kind === "avl"
        ? removeAvl(tree, selectedNode.value)
        : remove(tree, selectedNode.value);
    if (!result.removed) {
      notify("error", "Nó não encontrado.");
      return;
    }
    dispatch({
      type: "apply-binary",
      tree: result.tree,
      selectedId: null,
      notice: { tone: "success", text: `Nó ${selectedNode.value} removido.` },
    });
  };

  const clearTree = () => {
    if (isBusy || isCurrentTreeEmpty(state)) return;
    if (state.kind === "bst" || state.kind === "avl") {
      dispatch({
        type: "apply-binary",
        tree: null,
        selectedId: null,
        notice: { tone: "info", text: "Árvore limpa. Use Ctrl+Z para desfazer." },
      });
      return;
    }
    dispatch({
      type: "apply-multiway",
      tree: null,
      selectedId: null,
      notice: { tone: "info", text: "Árvore limpa. Use Ctrl+Z para desfazer." },
    });
  };

  const loadSample = () => {
    if (isBusy) return;
    if (state.kind === "bst") {
      dispatch({
        type: "apply-binary",
        tree: buildSampleTree(),
        selectedId: null,
        notice: { tone: "success", text: "Árvore de exemplo carregada." },
      });
      return;
    }
    if (state.kind === "avl") {
      dispatch({
        type: "apply-binary",
        tree: buildSampleAvlTree(),
        selectedId: null,
        notice: { tone: "success", text: "Árvore AVL de exemplo carregada." },
      });
      return;
    }
    dispatch({
      type: "apply-multiway",
      tree: buildSampleBTree(state.kind),
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

  const canUndo =
    !isBusy && Boolean(binary ? binary.past.length > 0 : multiway && multiway.past.length > 0);
  const canRedo =
    !isBusy && Boolean(binary ? binary.future.length > 0 : multiway && multiway.future.length > 0);

  return {
    state,
    kind: state.kind,
    isBusy,
    tree,
    btree,
    selectedNode,
    selectedBNode,
    displayedTree,
    displayedBTree,
    currentStep,
    isEmpty: isCurrentTreeEmpty(state),
    canUndo,
    canRedo,
    insert,
    search,
    removeValue,
    traverse,
    setKind,
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
  };
}

export type TreeActions = ReturnType<typeof useTreeActions>;
export type { Tree, BTree };
