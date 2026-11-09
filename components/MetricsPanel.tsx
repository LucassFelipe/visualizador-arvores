"use client";

import { useMemo } from "react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { KIND_INFO, isMultiwayKind } from "@/lib/constants";
import { cx } from "@/lib/cx";
import { computeMetrics, computeBTreeMetrics } from "@/lib/metrics";
import type { MultiwayKind } from "@/lib/types";
import { Icon } from "./ui/Icon";
import styles from "./SidePanel.module.css";

export function MetricsPanel() {
  const { kind, tree, btree } = useTreeActions();
  const multiway = isMultiwayKind(kind);
  const info = KIND_INFO[kind];

  const binaryMetrics = useMemo(
    () => (multiway ? null : computeMetrics(tree)),
    [multiway, tree],
  );
  const bMetrics = useMemo(
    () => (multiway ? computeBTreeMetrics(btree, kind as MultiwayKind) : null),
    [multiway, btree, kind],
  );

  const count = multiway ? bMetrics!.nodes : binaryMetrics!.count;
  const empty = multiway ? bMetrics!.nodes === 0 : binaryMetrics!.count === 0;

  const valid = multiway
    ? bMetrics!.valid
    : binaryMetrics!.valid && (kind === "avl" ? binaryMetrics!.balanced : true);

  const status = empty
    ? { label: "Vazia", tone: styles.badgeNeutral }
    : valid
      ? { label: `${info.label} válida`, tone: styles.badgeSuccess }
      : { label: "Inválida", tone: styles.badgeDanger };

  return (
    <section className={styles.card} aria-labelledby="metrics-title">
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id="metrics-title">
          <Icon name="layers" size={14} />
          Métricas
        </h2>
        <span className={cx(styles.badge, status.tone)}>{status.label}</span>
      </div>

      {multiway ? (
        <>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Nós</span>
              <strong className={styles.metricValue}>{bMetrics!.nodes}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Valores</span>
              <strong className={styles.metricValue}>{bMetrics!.values}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Altura</span>
              <strong className={styles.metricValue}>
                {bMetrics!.height}
                <small>{bMetrics!.height === 1 ? " nível" : " níveis"}</small>
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Folhas</span>
              <strong className={styles.metricValue}>{bMetrics!.leaves}</strong>
            </div>
          </div>

          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Raiz</span>
              <span className={styles.infoValue}>{bMetrics!.root ?? "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Mín / Máx</span>
              <span className={styles.infoValue}>
                {bMetrics!.min ?? "—"} / {bMetrics!.max ?? "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ordem</span>
              <span className={styles.infoValue}>
                {bMetrics!.order} · até {bMetrics!.order - 1} chaves/nó
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Chaves/nó</span>
              <span className={styles.infoValue}>
                {empty
                  ? "—"
                  : `${bMetrics!.minKeys}–${bMetrics!.maxKeys} (${bMetrics!.keys} no total)`}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span
                className={styles.infoLabel}
                title="Todas as folhas estão na mesma profundidade"
              >
                Folhas niveladas
              </span>
              <span
                className={cx(
                  styles.infoValue,
                  !empty && (bMetrics!.balanced ? styles.good : styles.bad),
                )}
              >
                {empty
                  ? "—"
                  : bMetrics!.balanced
                    ? "sim"
                    : "não"}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Nós</span>
              <strong className={styles.metricValue}>{binaryMetrics!.count}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Altura</span>
              <strong className={styles.metricValue}>
                {binaryMetrics!.height}
                <small>
                  {binaryMetrics!.height === 1 ? " nível" : " níveis"}
                </small>
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Folhas</span>
              <strong className={styles.metricValue}>{binaryMetrics!.leaves}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Prof. média</span>
              <strong className={styles.metricValue}>
                {binaryMetrics!.count === 0
                  ? "—"
                  : binaryMetrics!.avgDepth.toFixed(1).replace(".", ",")}
              </strong>
            </div>
          </div>

          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Raiz</span>
              <span className={styles.infoValue}>{binaryMetrics!.root ?? "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Mín / Máx</span>
              <span className={styles.infoValue}>
                {binaryMetrics!.min ?? "—"} / {binaryMetrics!.max ?? "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span
                className={styles.infoLabel}
                title="Todo nó tem |altura esquerda − altura direita| ≤ 1"
              >
                Balanceamento AVL
              </span>
              <span
                className={cx(
                  styles.infoValue,
                  binaryMetrics!.count > 0 &&
                    (binaryMetrics!.balanced ? styles.good : styles.bad),
                )}
              >
                {binaryMetrics!.count === 0
                  ? "—"
                  : binaryMetrics!.balanced
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
              <span className={styles.infoValue}>
                {binaryMetrics!.rootBalance === null
                  ? "—"
                  : `${binaryMetrics!.rootBalance > 0 ? "+" : ""}${binaryMetrics!.rootBalance}`}
              </span>
            </div>
          </div>
        </>
      )}

      <p className={styles.helpText} style={{ marginTop: 10 }}>
        {count === 0
          ? `Insira valores para acompanhar as métricas da árvore ${info.label}.`
          : multiway
            ? "No B+, os separadores internos são cópias das folhas; “Valores” conta apenas as folhas."
            : kind === "avl"
              ? "Após cada edição, a árvore é rebalanceada com rotações."
              : "A árvore é verificada contra a propriedade de busca a cada alteração."}
      </p>
    </section>
  );
}
