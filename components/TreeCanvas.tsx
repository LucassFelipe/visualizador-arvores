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
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/constants";
import { layoutTree } from "@/lib/layout";
import type { Tree, TreeNode as TreeNodeModel } from "@/lib/types";
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
    isBusy,
    displayedTree,
    currentStep,
    select,
    beginEdit,
    beginAdd,
    loadSample,
    setAutoFit,
  } = useTreeActions();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [animatingView, setAnimatingView] = useState(true);

  const layout = useMemo(() => layoutTree(displayedTree), [displayedTree]);

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

      if (layout.nodes.length === 0 || layout.width <= 0 || layout.height <= 0) {
        setAnimatingView(animate);
        setView({ x: 0, y: 0, zoom: 1 });
        return;
      }

      const padding = clamp(
        Math.min(size.width, size.height) * 0.12,
        44,
        92,
      );
      const availableWidth = Math.max(1, size.width - padding * 2);
      const availableHeight = Math.max(1, size.height - padding * 2);
      const zoom = clamp(
        Math.min(
          availableWidth / layout.width,
          availableHeight / layout.height,
        ),
        MIN_ZOOM,
        1.1,
      );

      setAnimatingView(animate);
      setView({
        zoom,
        x: (size.width - layout.width * zoom) / 2,
        y: (size.height - layout.height * zoom) / 2,
      });
    },
    [size.width, size.height, layout.width, layout.height, layout.nodes.length],
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

  const hasTree = layout.nodes.length > 0;
  const showHint = hasTree && !state.playback;

  return (
    <div
      ref={containerRef}
      className={cx(styles.canvas, dragging && styles.dragging)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Visualização da árvore binária"
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
          className={cx(
            styles.world,
            animatingView && styles.worldAnimating,
          )}
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          <AnimatePresence initial={false}>
            {layout.edges.map((edge) => (
              <TreeEdge
                key={edge.id}
                edge={edge}
                highlighted={
                  pathIds.has(edge.parentId) && pathIds.has(edge.childId)
                }
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {layout.nodes.map((node) => {
              const actual = treeNodes.get(node.id);
              const active = activeIds.has(node.id);
              return (
                <TreeNode
                  key={node.id}
                  node={node}
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
          hydrated={state.hydrated}
          disabled={isBusy}
          onSample={loadSample}
        />
      )}
    </div>
  );
}

function EmptyState({
  hydrated,
  disabled,
  onSample,
}: {
  hydrated: boolean;
  disabled: boolean;
  onSample: () => void;
}) {
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
      <h2 className={styles.emptyTitle}>Sua árvore começa aqui</h2>
      <p className={styles.emptyLead}>
        Digite um valor e clique em <strong>Inserir</strong>. Os nós se
        organizam sozinhos na posição certa.
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
        Valores únicos · BST · animações passo a passo
      </span>
    </div>
  );
}
