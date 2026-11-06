import { describe, expect, it } from "vitest";
import { buildTree } from "@/lib/bst";
import { INORDER_GAP, NODE_SIZE, V_GAP } from "@/lib/constants";
import { layoutTree } from "@/lib/layout";
import { traverse } from "@/lib/traversals";

const VALUES = [50, 30, 70, 20, 40, 60, 80];

describe("layout", () => {
  it("posiciona os nós em ordem simétrica, sem sobreposição", () => {
    const tree = buildTree(VALUES);
    const layout = layoutTree(tree);

    expect(layout.nodes).toHaveLength(7);
    expect(layout.edges).toHaveLength(6);

    const inOrder = traverse(tree, "inorder").map(
      (visit) => layout.nodes.find((node) => node.id === visit.id)!,
    );

    for (let i = 1; i < inOrder.length; i += 1) {
      expect(inOrder[i].x).toBeGreaterThan(inOrder[i - 1].x);
    }

    const byDepth = new Map<number, number[]>();
    for (const node of layout.nodes) {
      const xs = byDepth.get(node.depth) ?? [];
      xs.push(node.x);
      byDepth.set(node.depth, xs);
    }

    for (const xs of byDepth.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i += 1) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_SIZE);
      }
    }
  });

  it("coloca cada filho abaixo do pai", () => {
    const layout = layoutTree(buildTree(VALUES));
    const positions = new Map(layout.nodes.map((node) => [node.id, node]));

    for (const edge of layout.edges) {
      const parent = positions.get(edge.parentId)!;
      const child = positions.get(edge.childId)!;
      expect(child.y).toBeGreaterThan(parent.y);
      expect(edge.length).toBeGreaterThan(0);
    }
  });

  it("calcula largura e altura corretamente", () => {
    const layout = layoutTree(buildTree(VALUES));
    expect(layout.width).toBe(6 * INORDER_GAP + NODE_SIZE);
    expect(layout.height).toBe(2 * V_GAP + NODE_SIZE);
  });

  it("funciona em árvore vazia", () => {
    expect(layoutTree(null)).toEqual({
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
    });
  });

  it("mantém ordem e separação em árvore degenerada", () => {
    const tree = buildTree([10, 20, 30, 40, 50]);
    const layout = layoutTree(tree);
    const inOrder = traverse(tree, "inorder").map(
      (visit) => layout.nodes.find((node) => node.id === visit.id)!,
    );

    expect(layout.nodes).toHaveLength(5);
    expect(layout.edges).toHaveLength(4);
    expect(layout.height).toBe(4 * V_GAP + NODE_SIZE);

    for (let i = 1; i < inOrder.length; i += 1) {
      expect(inOrder[i].x).toBeGreaterThan(inOrder[i - 1].x);
      expect(inOrder[i].depth).toBeGreaterThan(inOrder[i - 1].depth);
    }
  });
});
