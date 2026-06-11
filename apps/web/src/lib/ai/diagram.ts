import type { DiagramNode, DiagramEdge } from "@/lib/ai/types";

function uid(len = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Assign fractional index strings: a1, a2 … a9, aA … aZ, b1 … */
function idx(n: number): string {
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

function layeredLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Map<string, { x: number; y: number }> {
  const NODE_W = 160;
  const NODE_H = 64;
  const H_GAP = 120;
  const V_GAP = 80;

  // Build adjacency
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (inDegree.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }

  // BFS layering from root nodes
  const layerOf = new Map<string, number>();
  const layers: string[][] = [];
  let queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);

  if (queue.length === 0) {
    // No roots (cycle or empty) → single layer
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
    // Orphans (unreachable nodes in a cycle subgraph)
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

const COLOR_MAP: Record<string, string> = {
  blue: "blue", violet: "violet", purple: "light-violet",
  green: "green", lime: "light-green",
  red: "red", pink: "light-red",
  orange: "orange", yellow: "yellow",
  grey: "grey", gray: "grey", black: "black", white: "white",
  cyan: "light-blue",
};

const GEO_MAP: Record<string, string> = {
  rectangle: "rectangle", rect: "rectangle",
  ellipse: "ellipse", circle: "ellipse", oval: "ellipse",
  diamond: "diamond", rhombus: "diamond",
  cylinder: "rectangle",
  hexagon: "hexagon",
  parallelogram: "parallelogram",
};

export function diagramSpecToSnapshot(opts: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}): unknown {
  const { nodes, edges } = opts;
  const pageId = "page:page";
  const positions = layeredLayout(nodes, edges);

  const records: unknown[] = [
    { id: "document:document", typeName: "document", gridSize: 10, name: "", meta: {} },
    { id: pageId, typeName: "page", name: "Page 1", index: "a1", meta: {} },
    { id: `camera:${pageId}`, typeName: "camera", x: -80, y: -80, z: 0.75, meta: {} },
    {
      id: `instance_page_state:${pageId}`, typeName: "instance_page_state",
      pageId, meta: {}, editingShapeId: null, focusedGroupId: null,
      hoveredShapeId: null, croppingShapeId: null,
      erasingShapeIds: [], hintingShapeIds: [], selectedShapeIds: [],
    },
    { id: "pointer:pointer", typeName: "pointer", x: 0, y: 0, lastActivityTimestamp: 0, meta: {} },
    {
      id: "instance:instance", typeName: "instance", meta: {},
      currentPageId: pageId,
      brush: null, cursor: { type: "default", rotation: 0 },
      insets: [true, true, true, true],
      isFocused: false, isPenMode: false, openMenus: [], scribbles: [],
      zoomBrush: null, isChatting: false, isGridMode: false, isReadonly: false,
      cameraState: "idle", chatMessage: "", isDebugMode: false, isFocusMode: false,
      isToolLocked: false,
      screenBounds: { x: 0, y: 0, w: 1200, h: 800 },
      duplicateProps: null, followingUserId: null,
      isChangingStyle: false, isCoarsePointer: false,
      devicePixelRatio: 1, exportBackground: true,
      isHoveringCanvas: false, highlightedUserIds: [],
      stylesForNextShape: {}, opacityForNextShape: 1,
    },
  ];

  // node id → shape id
  const shapeIdOf = new Map<string, string>();

  nodes.forEach((node, i) => {
    const shapeId = `shape:${uid()}`;
    shapeIdOf.set(node.id, shapeId);
    const pos = positions.get(node.id) ?? { x: i * 280, y: 0 };

    records.push({
      id: shapeId, typeName: "shape", type: "geo",
      x: pos.x, y: pos.y,
      rotation: 0, isLocked: false, opacity: 1, meta: {},
      parentId: pageId, index: idx(i + 1),
      props: {
        geo: GEO_MAP[node.shape ?? "rectangle"] ?? "rectangle",
        w: 160, h: 64,
        text: node.label,
        align: "middle", verticalAlign: "middle",
        color: COLOR_MAP[node.color ?? "blue"] ?? "blue",
        fill: "solid", dash: "draw", size: "m", font: "draw",
        url: "", growY: 0, labelColor: "black",
      },
    });
  });

  edges.forEach((edge, i) => {
    const fromId = shapeIdOf.get(edge.from);
    const toId = shapeIdOf.get(edge.to);
    if (!fromId || !toId) return;

    const arrowId = `shape:${uid()}`;
    records.push({
      id: arrowId, typeName: "shape", type: "arrow",
      x: 0, y: 0, rotation: 0, isLocked: false, opacity: 1, meta: {},
      parentId: pageId, index: idx(nodes.length + i + 1),
      props: {
        dash: "draw", size: "m", fill: "none",
        color: "black", labelColor: "black",
        bend: 0,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        arrowheadStart: "none", arrowheadEnd: "arrow",
        text: edge.label ?? "", labelPosition: 0.5, font: "draw",
      },
    });

    records.push({
      id: `binding:${uid()}`, typeName: "binding", type: "arrow",
      fromId: arrowId, toId: fromId, meta: {},
      props: { terminal: "start", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
    });
    records.push({
      id: `binding:${uid()}`, typeName: "binding", type: "arrow",
      fromId: arrowId, toId, meta: {},
      props: { terminal: "end", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
    });
  });

  // Schema sequences must exactly match the running tldraw version (extracted from real DB snapshot)
  return {
    schema: {
      schemaVersion: 2,
      sequences: {
        "com.tldraw.page": 1,
        "com.tldraw.user": 1,
        "com.tldraw.asset": 1,
        "com.tldraw.shape": 4,
        "com.tldraw.store": 5,
        "com.tldraw.camera": 1,
        "com.tldraw.pointer": 1,
        "com.tldraw.document": 2,
        "com.tldraw.instance": 26,
        "com.tldraw.shape.geo": 11,
        "com.tldraw.shape.draw": 4,
        "com.tldraw.shape.line": 5,
        "com.tldraw.shape.note": 12,
        "com.tldraw.shape.text": 4,
        "com.tldraw.asset.image": 6,
        "com.tldraw.asset.video": 5,
        "com.tldraw.shape.arrow": 8,
        "com.tldraw.shape.embed": 4,
        "com.tldraw.shape.frame": 1,
        "com.tldraw.shape.group": 0,
        "com.tldraw.shape.image": 5,
        "com.tldraw.shape.video": 4,
        "com.tldraw.binding.arrow": 1,
        "com.tldraw.asset.bookmark": 2,
        "com.tldraw.shape.bookmark": 2,
        "com.tldraw.shape.highlight": 3,
        "com.tldraw.instance_presence": 6,
        "com.tldraw.instance_page_state": 5,
      },
    },
    records,
  };
}
