"use client";

import { useTreeActions } from "@/hooks/useTreeActions";
import { countNodes } from "@/lib/bst";
import { TRAVERSAL_LABELS, TRAVERSAL_SHORT } from "@/lib/constants";
import { cx } from "@/lib/cx";
import type { TraversalOrder } from "@/lib/types";
import { Icon } from "./ui/Icon";
import styles from "./SidePanel.module.css";

const ORDERS: TraversalOrder[] = [
  "inorder",
  "preorder",
  "postorder",
  "level",
];

export function TraversalPanel() {
  const { state, displayedTree, currentStep, traverse } = useTreeActions();

  const activeOrder = state.playback?.order ?? null;
  const operationRunning = state.playback?.kind === "operation";
  const sequence = currentStep?.output ?? [];
  const total = countNodes(displayedTree);
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
              title={TRAVERSAL_LABELS[order]}
            >
              <span className={styles.traversalKey}>
                {TRAVERSAL_SHORT[order]}
              </span>
              <span className={styles.traversalLabel}>
                {TRAVERSAL_LABELS[order]}
              </span>
            </button>
          );
        })}
      </div>

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
                index === currentIndex
                  ? styles.chipCurrent
                  : styles.chipVisited,
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
              <strong>ordem de visita</strong>.
            </>
          )}
        </div>
      )}
    </section>
  );
}
