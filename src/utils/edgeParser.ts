export interface Point {
  x: number;
  y: number;
}

export interface RawEdge {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
  pathData: string;   // original path for render
  isDashed: boolean;
  sourceNodeId: string | null; // diisi setelah matching
  targetNodeId: string | null;
}

/**
 * Parse edge path data to calculate absolute start and end points.
 * Handles cumulative relative bezier ('c') and line ('l') segments.
 */
export const parseEdgePath = (d: string): { start: Point; end: Point } | null => {
  // 1. Ambil starting point (selalu absolut pada command 'm')
  const startMatch = d.match(/^m\s*([\d.E+-]+)\s+([\d.E+-]+)/);
  if (!startMatch) return null;
  
  let cx = parseFloat(startMatch[1]);
  let cy = parseFloat(startMatch[2]);
  const start = { x: cx, y: cy };
  
  // 2. Proses semua segments secara kumulatif
  // Cubic bezier 'c': dx1 dy1 dx2 dy2 dx dy (endpoint = dx, dy)
  const cubicSegments = [...d.matchAll(/c\s*([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)/g)];
  
  for (const seg of cubicSegments) {
    // Hanya ambil endpoint delta (parameter ke-5 dan ke-6)
    cx += parseFloat(seg[5]);
    cy += parseFloat(seg[6]);
  }
  
  // Line segments 'l': dx dy
  const lineSegments = [...d.matchAll(/l\s*([\d.E+-]+)\s+([\d.E+-]+)/g)];
  for (const seg of lineSegments) {
    cx += parseFloat(seg[1]);
    cy += parseFloat(seg[2]);
  }
  
  return { start, end: { x: cx, y: cy } };
};

/**
 * Extract all edge elements from SVG Document.
 * Filters for elements with stroke and without significant fill.
 */
export const extractEdges = (svgDoc: Document | Element): RawEdge[] => {
  const edges: RawEdge[] = [];
  
  // Ambil pasangan: invisible bbox + stroked path yang mengikutinya
  const paths = svgDoc.querySelectorAll('path[stroke]');
  
  paths.forEach((path, index) => {
    const stroke = path.getAttribute('stroke');
    const fill = path.getAttribute('fill');
    const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '1');
    const d = path.getAttribute('d') || '';
    
    // Filter: edge = stroke ada, fill = none atau transparent
    if (!stroke || stroke === 'none') return;
    
    // Google Slides uses fill="#000000" with no fill-opacity for some elements that are NOT edges
    // or fill-opacity="0.0" for invisible bboxes.
    // Edges usually have fill="none" or transparent fill.
    if (fill && fill !== 'none' && fill !== '#000000' && fill !== 'transparent') return;
    
    // Additional check for Google Slides vectorized text/shapes
    if (fill === '#000000' && !path.getAttribute('fill-opacity')) return;
    
    const endpoints = parseEdgePath(d);
    if (!endpoints) return;
    
    // Deteksi dashed (backup link)
    const strokeDasharray = path.getAttribute('stroke-dasharray');
    
    edges.push({
      id: `edge-${index}`,
      startX: endpoints.start.x,
      startY: endpoints.start.y,
      endX: endpoints.end.x,
      endY: endpoints.end.y,
      strokeColor: stroke,
      strokeWidth,
      pathData: d,
      isDashed: !!strokeDasharray,
      sourceNodeId: null,
      targetNodeId: null,
    });
  });
  
  return edges;
};
