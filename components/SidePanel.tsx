import { InspectorPanel } from "./InspectorPanel";
import { MetricsPanel } from "./MetricsPanel";
import { TraversalPanel } from "./TraversalPanel";
import styles from "./SidePanel.module.css";

export function SidePanel() {
  return (
    <aside
      className={styles.sidebar}
      aria-label="Métricas, percursos e inspetor da estrutura"
    >
      <MetricsPanel />
      <TraversalPanel />
      <InspectorPanel />
    </aside>
  );
}
