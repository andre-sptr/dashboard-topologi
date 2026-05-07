import type { RawNode, LabelRegion } from './googleSlidesSvgParser';
import type { RawEdge } from './edgeParser';
import type { VisualLabel } from './aiVisionLabelExtractor';

export interface NamedNode extends RawNode {
  label: string;
}

export interface TypedEdge extends RawEdge {
  edgeType: string;
  connectionType: 'primary' | 'backup';
}

const LABEL_MATCH_RADIUS = 300; // unit SVG — search for labels within this radius of node center
const ENDPOINT_MATCH_RADIUS = 200; // unit SVG — snap edge endpoints to node centers

/**
 * Match AI-extracted labels to nodes based on proximity.
 */
export const matchLabelsToNodes = (
  nodes: RawNode[],
  labels: VisualLabel[],
  _labelRegions: LabelRegion[] // Reserved for future refinement with bounding boxes
): NamedNode[] => {
  return nodes.map(node => {
    // Find closest label within radius
    const nearby = labels
      .map(label => ({
        label,
        distance: Math.sqrt(
          (label.approximateX - node.cx) ** 2 +
          (label.approximateY - node.cy) ** 2
        )
      }))
      .filter(item => item.distance < LABEL_MATCH_RADIUS)
      .sort((a, b) => a.distance - b.distance);
    
    const bestLabel = nearby[0]?.label.text ?? `Node-${node.id}`;
    
    return { ...node, label: bestLabel };
  });
};

/**
 * Match edges to nodes based on endpoint proximity.
 */
export const matchEdgesToNodes = (
  edges: RawEdge[],
  nodes: NamedNode[],
  legend: Array<{ color: string; meaning: string }>
): TypedEdge[] => {
  return edges.map(edge => {
    const findNearestNode = (px: number, py: number) =>
      nodes
        .map(n => ({ n, d: Math.sqrt((px - n.cx) ** 2 + (py - n.cy) ** 2) }))
        .filter(item => item.d < ENDPOINT_MATCH_RADIUS)
        .sort((a, b) => a.d - b.d)[0]?.n ?? null;
    
    const sourceNode = findNearestNode(edge.startX, edge.startY);
    const targetNode = findNearestNode(edge.endX, edge.endY);
    
    // Use dynamic legend from AI if available, otherwise fallback
    const edgeType = legend.find(l => 
      l.color.toLowerCase() === edge.strokeColor.toLowerCase()
    )?.meaning ?? inferEdgeTypeByColorFallback(edge.strokeColor);
    
    return {
      ...edge,
      sourceNodeId: sourceNode?.id ?? null,
      targetNodeId: targetNode?.id ?? null,
      edgeType,
      connectionType: edge.isDashed ? 'backup' : 'primary',
    };
  });
};

/**
 * Fallback edge color mapping based on initial analysis.
 */
const inferEdgeTypeByColorFallback = (color: string): string => {
  const mapping: Record<string, string> = {
    '#8e7cc3': 'backbone-fiber',
    '#664ea6': 'backbone-fiber',
    '#ff00ff': 'metro-fiber',
    '#6aa84f': 'access-ethernet',
    '#ff0000': 'access-ethernet',
    '#0000ff': 'access-ethernet',
    '#6d9eeb': 'distribution-ethernet',
    '#c27ba0': 'vpn-overlay',
    '#e69138': 'wireless',
  };
  
  return mapping[color.toLowerCase()] ?? 'unknown';
};
