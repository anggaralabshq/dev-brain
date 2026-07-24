import type { DiagramNode, DiagramEdge } from "@/lib/ai/types";

// Pure layout/mapping helpers shared by the server-side snapshot builder
// (lib/ai/diagram.ts) and the client-side live-canvas writer
// (components/architecture/apply-diagram.ts). No server-only imports here.

export function uid(len = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Assign fractional index strings: a1, a2 … a9, aA … aZ, b1 … */
export function idx(n: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const base = chars.length;
  let prefix = "a";
  let remainder = n;
  while (remainder >= base) {
    prefix += chars[remainder % base];
    remainder = Math.floor(remainder / base);
  }
  return prefix + chars[remainder];
}

export function layeredLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Map<string, { x: number; y: number }> {
  const NODE_W = 160;
  const NODE_H = 64;
  const H_GAP = 120;
  const V_GAP = 80;

  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (inDegree.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }

  const layerOf = new Map<string, number>();
  const layers: string[][] = [];
  let queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);

  if (queue.length === 0) {
    layers.push(nodes.map((n) => n.id));
  } else {
    let li = 0;
    while (queue.length > 0) {
      layers.push(queue);
      queue.forEach((id) => layerOf.set(id, li));
      const next: string[] = [];
      for (const id of queue) {
        for (const nxt of (adj.get(id) ?? [])) {
          if (!layerOf.has(nxt)) next.push(nxt);
        }
      }
      queue = [...new Set(next)];
      li++;
    }
    const orphans = nodes.filter((n) => !layerOf.has(n.id)).map((n) => n.id);
    if (orphans.length) layers.push(orphans);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalH = layer.length * NODE_H + (layer.length - 1) * V_GAP;
    const startY = -totalH / 2;
    for (let ni = 0; ni < layer.length; ni++) {
      positions.set(layer[ni], {
        x: li * (NODE_W + H_GAP),
        y: startY + ni * (NODE_H + V_GAP),
      });
    }
  }
  return positions;
}

export const COLOR_MAP: Record<string, string> = {
  blue: "blue", violet: "violet", purple: "light-violet",
  green: "green", lime: "light-green",
  red: "red", pink: "light-red",
  orange: "orange", yellow: "yellow",
  grey: "grey", gray: "grey", black: "black", white: "white",
  cyan: "light-blue",
};

export const GEO_MAP: Record<string, string> = {
  rectangle: "rectangle", rect: "rectangle",
  ellipse: "ellipse", circle: "ellipse", oval: "ellipse",
  diamond: "diamond", rhombus: "diamond",
  cylinder: "rectangle",
  hexagon: "hexagon",
  parallelogram: "parallelogram",
};
