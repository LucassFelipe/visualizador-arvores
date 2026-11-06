"use client";

import { useMemo } from "react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cx } from "@/lib/cx";
import { computeMetrics } from "@/lib/metrics";
import { Icon } from "./ui/Icon";
import styles from "./SidePanel.module.css";

export function MetricsPanel() {
  const { displayedTree } = useTreeActions();
  const metrics = useMemo(() => computeMetrics(displayedTree), [displayedTree]);

  const status =
    metrics.count === 0
      ? { label: "Vazia", tone: styles.badgeNeutral }
      : metrics.valid
        ? { label: "BST válida", tone: styles.badgeSuccess }
        : { label: "Inválida", tone: styles.badgeDanger };

  const factor =
    metrics.rootBalance === null
      ? "—"
      : `${metrics.rootBalance > 0 ? "+" : ""}${metrics.rootBalance}`;

  return (
    <section className={styles.card} aria-labelledby="metrics-title">
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id="metrics-title">
          <Icon name="layers" size={14} />
          Métricas
        </h2>
        <span className={cx(styles.badge, status.tone)}>{status.label}</span>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Nós</span>
          <strong className={styles.metricValue}>{metrics.count}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Altura</span>
          <strong className={styles.metricValue}>
            {metrics.height}
            <small>{metrics.height === 1 ? " nível" : " níveis"}</small>
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Folhas</span>
          <strong className={styles.metricValue}>{metrics.leaves}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Prof. média</span>
          <strong className={styles.metricValue}>
            {metrics.count === 0
              ? "—"
              : metrics.avgDepth.toFixed(1).replace(".", ",")}
          </strong>
        </div>
      </div>

      <div className={styles.infoRows}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Raiz</span>
          <span className={styles.infoValue}>{metrics.root ?? "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Mín / Máx</span>
          <span className={styles.infoValue}>
            {metrics.min ?? "—"} / {metrics.max ?? "—"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span
            className={styles.infoLabel}
            title="Todo nó tem |altura esquerda − altura direita| ≤ 1"
          >
            AVL
          </span>
          <span
            className={cx(
              styles.infoValue,
              metrics.count > 0 &&
                (metrics.balanced ? styles.good : styles.bad),
            )}
          >
            {metrics.count === 0
              ? "—"
              : metrics.balanced
                ? "balanceada"
                : "desbalanceada"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span
            className={styles.infoLabel}
            title="Altura da subárvore esquerda − altura da direita na raiz"
          >
            Fator da raiz
          </span>
          <span className={styles.infoValue}>{factor}</span>
        </div>
      </div>
    </section>
  );
}
