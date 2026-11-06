"use client";

import styles from "./TreeWorkspace.module.css";

export function TreeWorkspace() {
  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>Árvore Binária</strong>
            <small>Visualizador de BST</small>
          </span>
        </div>
      </header>
      <div className={styles.workspace}>
        <section className={styles.canvasArea}>
          <div className={styles.canvasPlaceholder}>
            <p>Canvas em construção</p>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <div className={styles.placeholderCard}>Métricas</div>
        </aside>
      </div>
    </main>
  );
}
