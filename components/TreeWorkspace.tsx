"use client";

import { TreeProvider } from "@/hooks/useTreeStore";
import { SidePanel } from "./SidePanel";
import { StepPlayer } from "./StepPlayer";
import { Toast } from "./Toast";
import { TopBar } from "./TopBar";
import { TreeCanvas } from "./TreeCanvas";
import styles from "./TreeWorkspace.module.css";

export function TreeWorkspace() {
  return (
    <TreeProvider>
      <main className={styles.app}>
        <TopBar />
        <div className={styles.workspace}>
          <section
            className={styles.canvasArea}
            aria-label="Área de visualização da árvore"
          >
            <TreeCanvas />
            <StepPlayer />
          </section>
          <SidePanel />
        </div>
        <Toast />
      </main>
    </TreeProvider>
  );
}
