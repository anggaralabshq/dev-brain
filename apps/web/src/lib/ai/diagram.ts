import type { DiagramNode, DiagramEdge } from "@/lib/ai/types";
import { uid, idx, layeredLayout, COLOR_MAP, GEO_MAP } from "@/lib/ai/diagram-layout";

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

  // loadStoreSnapshot expects { schema, store: Record<id, record> } — NOT an array.
  // Schema sequences must exactly match the running tldraw version (extracted from real DB snapshot).
  const store = Object.fromEntries(
    (records as Array<{ id: string }>).map((r) => [r.id, r])
  );

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
    store,
  };
}
