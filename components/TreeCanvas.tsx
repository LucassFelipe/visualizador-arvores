"use client";

import { AnimatePresence } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cx } from "@/lib/cx";
import { KIND_INFO, MAX_ZOOM, MIN_ZOOM, isMultiwayKind } from "@/lib/constants";
import { layoutBTree, layoutTree } from "@/lib/layout";
import type { Tree, TreeNode as TreeNodeModel, TreeKind } from "@/lib/types";
import { BTreeNode } from "./BTreeNode";
import { TreeEdge } from "./TreeEdge";
import { TreeNode } from "./TreeNode";
import { Button, IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import styles from "./TreeCanvas.module.css";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export function TreeCanvas() {
  const {
    state,
    kind,
    isBusy,
    displayedTree,
    displayedBTree,
    currentStep,
    select,
    beginEdit,
    beginAdd,
    loadSample,
    setAutoFit,
  } = useTreeActions();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const multiway = isMultiwayKind(kind);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [animatingView, setAnimatingView] = useState(true);

  const binaryLayout = useMemo(
    () => (multiway ? null : layoutTree(displayedTree)),
    [multiway, displayedTree],
  );
  const multiwayLayout = useMemo(
    () => (multiway ? layoutBTree(displayedBTree, kind) : null),
    [multiway, displayedBTree, kind],
  );

  const layoutWidth = multiway
    ? (multiwayLayout?.width ?? 0)
    : (binaryLayout?.width ?? 0);
  const layoutHeight = multiway
    ? (multiwayLayout?.height ?? 0)
    : (binaryLayout?.height ?? 0);
  const hasTree = multiway
    ? (multiwayLayout?.nodes.length ?? 0) > 0
    : (binaryLayout?.nodes.length ?? 0) > 0;

  const treeNodes = useMemo(() => {
    const map = new Map<string, TreeNodeModel>();
    const walk = (node: Tree) => {
      if (!node) return;
      map.set(node.id, node);
      walk(node.left);
      walk(node.right);
    };
    walk(displayedTree);
    return map;
  }, [displayedTree]);

  const activeIds = useMemo(
    () => new Set(currentStep?.activeIds ?? []),
    [currentStep],
  );
  const pathIds = useMemo(
    () => new Set(currentStep?.pathIds ?? []),
    [currentStep],
  );
  const visitedIds = useMemo(
    () => new Set(currentStep?.visitedIds ?? []),
    [currentStep],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitToView = useCallback(
    (animate = true) => {
      if (size.width <= 0 || size.height <= 0) return;

      if (!hasTree || layoutWidth <= 0 || layoutHeight <= 0) {
        setAnimatingView(animate);
        setView({ x: 0, y: 0, zoom: 1 });
        return;
      }

      const padding = clamp(Math.min(size.width, size.height) * 0.12, 44, 92);
      const availableWidth = Math.max(1, size.width - padding * 2);
      const availableHeight = Math.max(1, size.height - padding * 2);
      const zoom = clamp(
        Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight),
        MIN_ZOOM,
        1.1,
      );

      setAnimatingView(animate);
      setView({
        zoom,
        x: (size.width - layoutWidth * zoom) / 2,
        y: (size.height - layoutHeight * zoom) / 2,
      });
    },
    [size.width, size.height, layoutWidth, layoutHeight, hasTree],
  );

  useEffect(() => {
    if (!state.autoFit) return;
    fitToView(true);
  }, [state.autoFit, fitToView]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      setAnimatingView(false);
      if (state.autoFit) setAutoFit(false);

      setView((current) => {
        const factor = Math.exp(-event.deltaY * 0.0014);
        const nextZoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === current.zoom) return current;
        const ratio = nextZoom / current.zoom;
        return {
          zoom: nextZoom,
          x: cursorX - (cursorX - current.x) * ratio,
          y: cursorY - (cursorY - current.y) * ratio,
        };
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [state.autoFit, setAutoFit]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, input, [data-interactive]")) return;

    select(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    setDragging(true);
    setAnimatingView(false);
    if (state.autoFit) setAutoFit(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setView((current) => ({
      ...current,
      x: drag.originX + dx,
      y: drag.originY + dy,
    }));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const zoomBy = (factor: number) => {
    setAnimatingView(false);
    if (state.autoFit) setAutoFit(false);

    setView((current) => {
      const nextZoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === current.zoom) return current;
      const ratio = nextZoom / current.zoom;
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      return {
        zoom: nextZoom,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  };

  const handleFit = () => {
    setAutoFit(true);
    fitToView(true);
  };

  const showHint = hasTree && !state.playback;
  const info = KIND_INFO[kind];

  return (
    <div
      ref={containerRef}
      className={cx(styles.canvas, dragging && styles.dragging)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={`Visualização da árvore ${info.label}`}
    >
      {hasTree ? (
        <div className={styles.zoomControls} data-interactive>
          <IconButton
            icon="zoomOut"
            label="Diminuir zoom"
            size="sm"
            onClick={() => zoomBy(0.82)}
            disabled={view.zoom <= MIN_ZOOM + 0.001}
          />
          <span className={styles.zoomValue} aria-live="polite">
            {Math.round(view.zoom * 100)}%
          </span>
          <IconButton
            icon="zoomIn"
            label="Aumentar zoom"
            size="sm"
            onClick={() => zoomBy(1.22)}
            disabled={view.zoom >= MAX_ZOOM - 0.001}
          />
          <span className={styles.zoomDivider} aria-hidden="true" />
          <IconButton
            icon="fit"
            label="Ajustar árvore à tela"
            size="sm"
            onClick={handleFit}
          />
        </div>
      ) : null}

      {showHint ? (
        <div className={styles.hint} aria-hidden="true">
          <Icon name="layers" size={13} />
          Arraste para navegar · role para dar zoom
        </div>
      ) : null}

      {hasTree ? (
        <div
          className={cx(styles.world, animatingView && styles.worldAnimating)}
          style={{
            width: layoutWidth,
            height: layoutHeight,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          <AnimatePresence initial={false}>
            {(multiway ? multiwayLayout!.edges : binaryLayout!.edges).map((edge) => (
              <TreeEdge
                key={edge.id}
                edge={edge}
                animated={isBusy}
                highlighted={
                  edge.variant !== "leaf-link" &&
                  pathIds.has(edge.parentId) &&
                  pathIds.has(edge.childId)
                }
              />
            ))}
          </AnimatePresence>

          <AnimatePresence mode={multiway ? "sync" : undefined}>
            {multiway
              ? multiwayLayout!.nodes.map((node) => {
                  const active = activeIds.has(node.id);
                  return (
                    <BTreeNode
                      key={node.id}
                      node={node}
                      animated={isBusy}
                      selected={state.selectedId === node.id}
                      active={active}
                      compare={active ? currentStep?.compare : undefined}
                      found={
                        currentStep?.kind === "found" && activeIds.has(node.id)
                      }
                      visited={visitedIds.has(node.id)}
                      onPath={pathIds.has(node.id)}
                      disabled={isBusy}
                      onSelect={select}
                    />
                  );
                })
              : binaryLayout!.nodes.map((node) => {
                  const actual = treeNodes.get(node.id);
                  const active = activeIds.has(node.id);
                  return (
                    <TreeNode
                      key={node.id}
                      node={node}
                      animated={isBusy}
                      selected={state.selectedId === node.id}
                      active={active}
                      compare={active ? currentStep?.compare : undefined}
                      found={
                        currentStep?.kind === "found" && activeIds.has(node.id)
                      }
                      visited={visitedIds.has(node.id)}
                      onPath={pathIds.has(node.id)}
                      disabled={isBusy}
                      showAddSlots={
                        state.selectedId === node.id &&
                        state.editorMode === "idle" &&
                        !isBusy
                      }
                      hasLeft={Boolean(actual?.left)}
                      hasRight={Boolean(actual?.right)}
                      onSelect={select}
                      onBeginEdit={beginEdit}
                      onBeginAdd={beginAdd}
                    />
                  );
                })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          kind={kind}
          hydrated={state.hydrated}
          disabled={isBusy}
          onSample={loadSample}
        />
      )}
    </div>
  );
}

function EmptyState({
  kind,
  hydrated,
  disabled,
  onSample,
}: {
  kind: TreeKind;
  hydrated: boolean;
  disabled: boolean;
  onSample: () => void;
}) {
  const info = KIND_INFO[kind];

  if (!hydrated) {
    return (
      <div className={styles.empty} aria-busy="true">
        <div className={cx(styles.emptyMark, styles.emptyMarkLoading)}>
          <Icon name="tree" size={30} />
        </div>
        <p className={styles.emptyLead}>Carregando sua árvore…</p>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <div className={styles.emptyMark} aria-hidden="true">
        <Icon name="tree" size={30} />
      </div>
      <h2 className={styles.emptyTitle}>Sua árvore {info.label} começa aqui</h2>
      <p className={styles.emptyLead}>
        Digite um valor e clique em <strong>Inserir</strong>. A estrutura se
        organiza sozinha e mostra cada ajuste passo a passo.
      </p>
      <Button
        variant="secondary"
        icon="sparkles"
        onClick={onSample}
        disabled={disabled}
      >
        Carregar exemplo
      </Button>
      <span className={styles.emptyHint}>
        Valores únicos · {info.description} · animações passo a passo
      </span>
    </div>
  );
}
