"use client";

import { motion } from "motion/react";
import type { LayoutBNode } from "@/lib/layout";
import styles from "./TreeCanvas.module.css";

interface BTreeNodeProps {
  node: LayoutBNode;
  selected: boolean;
  active: boolean;
  compare?: "left" | "right" | "equal";
  found: boolean;
  visited: boolean;
  onPath: boolean;
  disabled: boolean;
  /** false = transições instantâneas (undo/redo/editor fora do playback). */
  animated: boolean;
  onSelect: (id: string) => void;
}

function keyFontSize(value: number): number {
  const digits = `${Math.abs(value)}`.length + (value < 0 ? 1 : 0);
  if (digits <= 2) return 15;
  if (digits === 3) return 13;
  if (digits === 4) return 11;
  if (digits === 5) return 9.5;
  return 8.5;
}

export function BTreeNode({
  node,
  selected,
  active,
  compare,
  found,
  visited,
  onPath,
  disabled,
  animated,
  onSelect,
}: BTreeNodeProps) {
  return (
    <motion.div
      className={styles.bNodeWrap}
      style={{
        width: node.width,
        height: node.height,
        zIndex: active ? 5 : selected ? 4 : 2,
      }}
      initial={{
        opacity: 0,
        scale: 0.75,
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
      }}
      exit={{
        opacity: 0,
        scale: 0.55,
        transition: {
          duration: animated ? 0.22 : 0,
          ease: "easeIn",
        },
      }}
      transition={
        animated
          ? { type: "spring", stiffness: 400, damping: 34, mass: 0.8 }
          : { duration: 0 }
      }
    >
      <button
        type="button"
        className={styles.bNode}
        data-selected={selected || undefined}
        data-active={active || undefined}
        data-compare={compare || undefined}
        data-found={found || undefined}
        data-visited={visited || undefined}
        data-path={onPath || undefined}
        aria-label={`Nó com as chaves ${node.keys.join(", ")}${active ? ", em destaque" : ""}`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onSelect(node.id);
        }}
      >
        {node.keys.map((key, index) => (
          <span
            key={`${index}-${key}`}
            className={styles.bKey}
            style={{ fontSize: keyFontSize(key) }}
          >
            {key}
          </span>
        ))}
      </button>
    </motion.div>
  );
}
