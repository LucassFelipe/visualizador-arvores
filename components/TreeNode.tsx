"use client";

import { motion } from "motion/react";
import { cx } from "@/lib/cx";
import { NODE_RADIUS, NODE_SIZE } from "@/lib/constants";
import type { LayoutNode } from "@/lib/layout";
import { Icon } from "./ui/Icon";
import styles from "./TreeCanvas.module.css";

interface TreeNodeProps {
  node: LayoutNode;
  selected: boolean;
  active: boolean;
  compare?: "left" | "right" | "equal";
  found: boolean;
  visited: boolean;
  onPath: boolean;
  disabled: boolean;
  showAddSlots: boolean;
  hasLeft: boolean;
  hasRight: boolean;
  onSelect: (id: string) => void;
  onBeginEdit: (id: string) => void;
  onBeginAdd: (id: string, side: "left" | "right") => void;
}

function valueFontSize(value: number): number {
  const digits = `${Math.abs(value)}`.length + (value < 0 ? 1 : 0);
  if (digits <= 2) return 16;
  if (digits === 3) return 14.5;
  if (digits === 4) return 12.5;
  if (digits === 5) return 11;
  return 9.8;
}

export function TreeNode({
  node,
  selected,
  active,
  compare,
  found,
  visited,
  onPath,
  disabled,
  showAddSlots,
  hasLeft,
  hasRight,
  onSelect,
  onBeginEdit,
  onBeginAdd,
}: TreeNodeProps) {
  return (
    <motion.div
      className={styles.nodeWrap}
      style={{
        width: NODE_SIZE,
        height: NODE_SIZE,
        zIndex: active ? 5 : selected ? 4 : 2,
      }}
      initial={{
        opacity: 0,
        scale: 0.55,
        x: node.x - NODE_RADIUS,
        y: node.y - NODE_RADIUS,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: node.x - NODE_RADIUS,
        y: node.y - NODE_RADIUS,
      }}
      exit={{
        opacity: 0,
        scale: 0.45,
        transition: { duration: 0.24, ease: "easeIn" },
      }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
    >
      <button
        type="button"
        className={styles.node}
        data-selected={selected || undefined}
        data-active={active || undefined}
        data-compare={compare || undefined}
        data-found={found || undefined}
        data-visited={visited || undefined}
        data-path={onPath || undefined}
        aria-label={`Nó ${node.value}${active ? ", em destaque" : ""}`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onSelect(node.id);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!disabled) onBeginEdit(node.id);
        }}
      >
        <span
          className={styles.nodeValue}
          style={{ fontSize: valueFontSize(node.value) }}
        >
          {node.value}
        </span>
      </button>

      {showAddSlots && !hasLeft ? (
        <button
          type="button"
          className={cx(styles.addSlot, styles.addLeft)}
          aria-label={`Adicionar filho à esquerda de ${node.value}`}
          title="Adicionar filho à esquerda"
          onClick={(event) => {
            event.stopPropagation();
            onBeginAdd(node.id, "left");
          }}
        >
          <Icon name="plus" size={13} />
        </button>
      ) : null}

      {showAddSlots && !hasRight ? (
        <button
          type="button"
          className={cx(styles.addSlot, styles.addRight)}
          aria-label={`Adicionar filho à direita de ${node.value}`}
          title="Adicionar filho à direita"
          onClick={(event) => {
            event.stopPropagation();
            onBeginAdd(node.id, "right");
          }}
        >
          <Icon name="plus" size={13} />
        </button>
      ) : null}
    </motion.div>
  );
}
