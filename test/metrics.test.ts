import { describe, expect, it } from "vitest";
import { buildTree } from "@/lib/bst";
import { computeMetrics } from "@/lib/metrics";

describe("métricas", () => {
  it("calcula métricas de uma árvore perfeita", () => {
    const metrics = computeMetrics(buildTree([50, 30, 70, 20, 40, 60, 80]));

    expect(metrics.count).toBe(7);
    expect(metrics.leaves).toBe(4);
    expect(metrics.internal).toBe(3);
    expect(metrics.height).toBe(3);
    expect(metrics.min).toBe(20);
    expect(metrics.max).toBe(80);
    expect(metrics.root).toBe(50);
    expect(metrics.avgDepth).toBeCloseTo(10 / 7, 5);
    expect(metrics.balanced).toBe(true);
    expect(metrics.rootBalance).toBe(0);
    expect(metrics.valid).toBe(true);
  });

  it("detecta desbalanceamento em árvore degenerada", () => {
    const metrics = computeMetrics(buildTree([10, 20, 30]));

    expect(metrics.count).toBe(3);
    expect(metrics.leaves).toBe(1);
    expect(metrics.height).toBe(3);
    expect(metrics.balanced).toBe(false);
    expect(metrics.rootBalance).toBe(-2);
    expect(metrics.avgDepth).toBeCloseTo(1, 5);
  });

  it("lida com árvore vazia", () => {
    const metrics = computeMetrics(null);

    expect(metrics.count).toBe(0);
    expect(metrics.leaves).toBe(0);
    expect(metrics.internal).toBe(0);
    expect(metrics.height).toBe(0);
    expect(metrics.min).toBeNull();
    expect(metrics.max).toBeNull();
    expect(metrics.root).toBeNull();
    expect(metrics.avgDepth).toBe(0);
    expect(metrics.balanced).toBe(true);
    expect(metrics.rootBalance).toBeNull();
    expect(metrics.valid).toBe(true);
  });
});
