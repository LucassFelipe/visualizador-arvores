import { InspectorPanel } from "./InspectorPanel";
import { MetricsPanel } from "./MetricsPanel";
import { TraversalPanel } from "./TraversalPanel";
import styles from "./SidePanel.module.css";

export function SidePanel() {
  return (
    <aside
      className={styles.sidebar}
      aria-label="Métricas, percursos e editor da árvore"
    >
      <MetricsPanel />
      <TraversalPanel />
      <InspectorPanel />
    </aside>
  );
}
