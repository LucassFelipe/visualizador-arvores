"use client";

import { useTreeActions } from "@/hooks/useTreeActions";
import { countNodes } from "@/lib/bst";
import { traverseB } from "@/lib/traversals";
import {
  KIND_INFO,
  isMultiwayKind,
  traversalLabels,
  traversalShort,
} from "@/lib/constants";
import { cx } from "@/lib/cx";
import type { MultiwayKind, TraversalOrder } from "@/lib/types";
import { Icon } from "./ui/Icon";
import styles from "./SidePanel.module.css";

const ORDERS: TraversalOrder[] = ["inorder", "preorder", "postorder", "level"];

export function TraversalPanel() {
  const { kind, displayedTree, displayedBTree, state, currentStep, traverse } =
    useTreeActions();

  const multiway = isMultiwayKind(kind);
  const labels = traversalLabels(kind);
  const shorts = traversalShort(kind);
  const activeOrder = state.playback?.order ?? null;
  const operationRunning = state.playback?.kind === "operation";
  const sequence = currentStep?.output ?? [];
  const total = multiway
    ? traverseB(displayedBTree, activeOrder ?? "inorder", kind as MultiwayKind).length
    : countNodes(displayedTree);
  const currentIndex =
    currentStep?.kind === "visit" ? sequence.length - 1 : -1;

  return (
    <section className={styles.card} aria-labelledby="traversal-title">
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id="traversal-title">
          <Icon name="tree" size={14} />
          Percursos
        </h2>
        <span
          className={cx(
            styles.badge,
            sequence.length > 0 ? styles.badgeAccent : styles.badgeNeutral,
          )}
        >
          {sequence.length > 0 ? `${sequence.length}/${total}` : "4 ordens"}
        </span>
      </div>

      <div className={styles.traversalGrid}>
        {ORDERS.map((order) => {
          const active = activeOrder === order;
          return (
            <button
              key={order}
              type="button"
              className={styles.traversalButton}
              data-active={active || undefined}
              onClick={() => traverse(order)}
              disabled={operationRunning}
              title={labels[order]}
            >
              <span className={styles.traversalKey}>{shorts[order]}</span>
              <span className={styles.traversalLabel}>{labels[order]}</span>
            </button>
          );
        })}
      </div>

      {kind === "bplus" ? (
        <p className={styles.helpText} style={{ marginTop: 2 }}>
          No B+, <strong>Folhas</strong> percorre a sequência ordenada; os
          separadores internos aparecem apenas nos percursos estruturais.
        </p>
      ) : null}

      {sequence.length > 0 ? (
        <div
          className={styles.sequence}
          aria-label={`Sequência do percurso: ${sequence.join(", ")}`}
        >
          {sequence.map((value, index) => (
            <span
              key={`${index}-${value}`}
              className={cx(
                styles.chip,
                index === currentIndex ? styles.chipCurrent : styles.chipVisited,
              )}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.sequenceEmpty}>
          {state.playback?.kind === "traversal" ? (
            "A árvore está vazia — nenhum nó para visitar."
          ) : (
            <>
              Escolha um percurso para ver a{" "}
              <strong>ordem de visita</strong> da árvore {KIND_INFO[kind].label}.
            </>
          )}
        </div>
      )}
    </section>
  );
}
