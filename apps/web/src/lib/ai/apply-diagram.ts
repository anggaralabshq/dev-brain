import type { Editor } from "tldraw";
import type { DiagramNode, DiagramEdge } from "@/lib/ai/types";
import { uid, layeredLayout, COLOR_MAP, GEO_MAP } from "@/lib/ai/diagram-layout";

/**
 * Writes an AI-generated diagram spec directly onto the currently mounted
 * tldraw editor — via editor.createShapes/createBindings, not a snapshot
 * replace, so it merges into whatever's already on the board.
 * Shape/binding ids are plain "shape:"/id strings cast past tldraw's
 * branded TLShapeId type, same pragmatic approach as diagramSpecToSnapshot.
 */
export function applyDiagramToEditor(
  editor: Editor,
  spec: { nodes: DiagramNode[]; edges: DiagramEdge[] },
): void {
  const { nodes, edges } = spec;
  if (nodes.length === 0) return;

  const positions = layeredLayout(nodes, edges);
  const center = editor.getViewportPageBounds().center;

  const shapeIdOf = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapes: any[] = [];

  nodes.forEach((node, i) => {
    const id = `shape:${uid()}`;
    shapeIdOf.set(node.id, id);
    const pos = positions.get(node.id) ?? { x: i * 280, y: 0 };
    shapes.push({
      id, type: "geo",
      x: center.x + pos.x, y: center.y + pos.y,
      props: {
        geo: GEO_MAP[node.shape ?? "rectangle"] ?? "rectangle",
        w: 160, h: 64,
        text: node.label,
        align: "middle", verticalAlign: "middle",
        color: COLOR_MAP[node.color ?? "blue"] ?? "blue",
        fill: "solid", dash: "draw", size: "m", font: "draw",
      },
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindings: any[] = [];
  edges.forEach((edge) => {
    const fromId = shapeIdOf.get(edge.from);
    const toId = shapeIdOf.get(edge.to);
    if (!fromId || !toId) return;

    const arrowId = `shape:${uid()}`;
    shapes.push({
      id: arrowId, type: "arrow",
      x: 0, y: 0,
      props: {
        dash: "draw", size: "m", fill: "none",
        color: "black", labelColor: "black", bend: 0,
        arrowheadStart: "none", arrowheadEnd: "arrow",
        text: edge.label ?? "",
      },
    });
    bindings.push(
      { type: "arrow", fromId: arrowId, toId: fromId, props: { terminal: "start", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false } },
      { type: "arrow", fromId: arrowId, toId, props: { terminal: "end", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false } },
    );
  });

  editor.createShapes(shapes);
  if (bindings.length > 0) editor.createBindings(bindings);

  const newIds = shapes.map((s) => s.id);
  editor.select(...newIds);
  editor.zoomToSelection({ animation: { duration: 300 } });
}
