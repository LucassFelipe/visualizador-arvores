"use client";

import { motion } from "motion/react";
import { cx } from "@/lib/cx";
import type { LayoutEdge } from "@/lib/layout";
import styles from "./TreeCanvas.module.css";

interface TreeEdgeProps {
  edge: LayoutEdge;
  highlighted: boolean;
  /** false = transições instantâneas (undo/redo/editor fora do playback). */
  animated: boolean;
}

export function TreeEdge({ edge, highlighted, animated }: TreeEdgeProps) {
  return (
    <motion.div
      className={cx(
        styles.edge,
        edge.variant === "leaf-link" && styles.edgeLeafLink,
        highlighted && edge.variant !== "leaf-link" && styles.edgeHighlighted,
      )}
      initial={{
        opacity: 0,
        width: edge.length,
        x: edge.x,
        y: edge.y - 1,
        rotate: edge.angle,
      }}
      animate={{
        opacity: 1,
        width: edge.length,
        x: edge.x,
        y: edge.y - 1,
        rotate: edge.angle,
      }}
      exit={{
        opacity: 0,
        transition: { duration: animated ? 0.18 : 0 },
      }}
      transition={
        animated
          ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 }
      }
    />
  );
}
