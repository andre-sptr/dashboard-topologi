/**
 * Google Slides SVG Parser
 * 
 * This parser is specifically designed to understand Google Slides exported SVG structure
 * and extract topology semantics (nodes, edges, labels).
 * 
 * Key Features:
 * - Detects network nodes vs edges using heuristics
 * - Extracts and associates labels with nodes
 * - Resolves edge endpoints to connect nodes
 * - Handles Google Slides quirks (nested groups, transforms, inline styles)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum area (width * height) for an element to be considered a node */
const MINIMUM_NODE_AREA_THRESHOLD = 100;

/** Maximum distance (in SVG units) for a label to be associated with a node */
const LABEL_PROXIMITY_THRESHOLD = 50;

/** Maximum distance (in SVG units) for edge endpoint snapping to nodes */
const ENDPOINT_SNAP_THRESHOLD = 20;

/** Minimum stroke width to be considered a visible edge */
const MINIMUM_EDGE_STROKE_WIDTH = 0.5;

/** Maximum aspect ratio (width/height or height/width) for circular/square nodes */
// const SQUARE_ASPECT_RATIO_THRESHOLD = 2.0; // Unused

// ============================================================================
// INTERFACES
// ============================================================================

export interface ParsedTopologyGraph {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  viewBox: string;
  originalBounds: { width: number; height: number };
  rawAssets: Asset[];
}

export interface ParsedNode {
  id: string;
  label: string;
  shape: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'custom';
  bounds: { x: number; y: number; width: number; height: number };
  fillColor: string;
  strokeColor: string;
  fontSize?: number;
  rawElement: string;
}

export interface ParsedEdge {
  id: string;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  label?: string;
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
  points: Array<{ x: number; y: number }>;
  arrowMarker?: 'start' | 'end' | 'both';
}

export interface Asset {
  type: string;
  id?: string;
  content: string;
}

interface TextElement {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  element: Element;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColorInfo {
  fill: string;
  stroke: string;
}

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Main entry point for parsing Google Slides SVG content
 * @param svgContent - Raw SVG string from Google Slides export
 * @returns Parsed topology graph with nodes, edges, and metadata
 */
export function parseGoogleSlidesSvg(svgContent: string): ParsedTopologyGraph {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      throw new Error('Invalid SVG content: No SVG element found');
    }

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.warn('SVG parsing warning:', parserError.textContent);
    }

    // Extract viewBox and dimensions
    const viewBox = svgElement.getAttribute('viewBox') || 
                    `0 0 ${svgElement.getAttribute('width') || 1000} ${svgElement.getAttribute('height') || 1000}`;
    const [, , width, height] = viewBox.split(' ').map(Number);

    // Extract assets (gradients, filters, markers, patterns)
    const rawAssets = extractAssets(doc);

    // Extract all visual elements
    const allElements = extractAllElements(svgElement);

    // Separate nodes and edges using heuristics
    const nodeElements = allElements.filter(el => isNodeElement(el.element));
    const edgeElements = allElements.filter(el => isEdgeElement(el.element));

    // Extract text elements
    const textElements = extractTextElements(doc);

    // Parse nodes
    const nodes = parseNodes(nodeElements);

    // Associate labels with nodes
    associateLabelsToNodes(nodes, textElements);

    // Parse edges
    const edges = parseEdges(edgeElements);

    // Resolve edge endpoints to nodes
    resolveEdgeEndpoints(edges, nodes);

    return {
      nodes,
      edges,
      viewBox,
      originalBounds: { width, height },
      rawAssets,
    };
  } catch (error) {
    console.error('Error parsing Google Slides SVG:', error);
    // Return empty graph instead of throwing
    return {
      nodes: [],
      edges: [],
      viewBox: '0 0 1000 1000',
      originalBounds: { width: 1000, height: 1000 },
      rawAssets: [],
    };
  }
}

// ============================================================================
// ASSET EXTRACTION
// ============================================================================

/**
 * Extract reusable assets (gradients, filters, markers, patterns) from SVG
 */
function extractAssets(doc: Document): Asset[] {
  const assets: Asset[] = [];
  const assetTags = ['linearGradient', 'radialGradient', 'filter', 'marker', 'pattern', 'clipPath', 'mask'];

  assetTags.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(element => {
      assets.push({
        type: tag,
        id: element.getAttribute('id') || undefined,
        content: element.outerHTML,
      });
    });
  });

  // Extract global styles
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => {
    assets.push({
      type: 'style',
      content: style.innerHTML,
    });
  });

  return assets;
}

// ============================================================================
// ELEMENT EXTRACTION
// ============================================================================

interface ExtractedElement {
  element: Element;
  transform: string;
}

/**
 * Extract all visual elements from SVG, handling nested groups and transforms
 */
function extractAllElements(svgElement: Element): ExtractedElement[] {
  const elements: ExtractedElement[] = [];
  const nonVisualTags = ['defs', 'style', 'metadata', 'title', 'desc', 'script',
                         'linearGradient', 'radialGradient', 'filter', 'marker', 
                         'pattern', 'clipPath', 'mask'];

  function traverse(node: Element, parentTransform = '') {
    const children = Array.from(node.children);

    children.forEach(child => {
      const tagName = child.tagName.toLowerCase();

      // Skip non-visual elements
      if (nonVisualTags.includes(tagName)) {
        return;
      }

      // Handle groups - traverse children with accumulated transform
      if (tagName === 'g') {
        const currentTransform = child.getAttribute('transform') || '';
        const combinedTransform = combineTransforms(parentTransform, currentTransform);
        traverse(child, combinedTransform);
        return;
      }

      // Add visual elements
      const transform = child.getAttribute('transform') || parentTransform;
      elements.push({ element: child, transform });
    });
  }

  traverse(svgElement);
  return elements;
}

/**
 * Combine parent and child transforms
 */
function combineTransforms(parent: string, child: string): string {
  if (!parent && !child) return '';
  if (!parent) return child;
  if (!child) return parent;
  return `${parent} ${child}`;
}

// ============================================================================
// SHAPE TYPE DETECTION
// ============================================================================

/**
 * Identify the shape type of an SVG element
 */
export function detectShapeType(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'rect':
      return 'rect';
    case 'circle':
      return 'circle';
    case 'ellipse':
      return 'ellipse';
    case 'polygon':
    case 'polyline':
      return 'polygon';
    case 'path':
      // Analyze path to determine if it's a simple shape
      const d = element.getAttribute('d') || '';
      if (isCircularPath(d)) return 'circle';
      if (isRectangularPath(d)) return 'rect';
      return 'custom';
    default:
      return 'custom';
  }
}

/**
 * Check if a path represents a circle/ellipse
 */
function isCircularPath(d: string): boolean {
  // Simple heuristic: contains arc commands (A or a)
  return /[Aa]/.test(d) && d.split(/[Aa]/).length > 2;
}

/**
 * Check if a path represents a rectangle
 */
function isRectangularPath(d: string): boolean {
  // Simple heuristic: mostly horizontal and vertical lines
  const commands = d.match(/[MLHVZmlhvz]/g) || [];
  const hvCommands = commands.filter(c => /[HVhv]/.test(c)).length;
  return hvCommands > commands.length * 0.6;
}

// ============================================================================
// COLOR EXTRACTION
// ============================================================================

/**
 * Extract fill and stroke colors from element (handles inline styles, attributes, CSS)
 */
export function extractColorInfo(element: Element): ColorInfo {
  let fill = 'none';
  let stroke = 'none';

  // Priority 1: Inline style
  const style = element.getAttribute('style');
  if (style) {
    const fillMatch = style.match(/fill:\s*([^;]+)/);
    const strokeMatch = style.match(/stroke:\s*([^;]+)/);
    if (fillMatch) fill = fillMatch[1].trim();
    if (strokeMatch) stroke = strokeMatch[1].trim();
  }

  // Priority 2: Direct attributes (if not found in style)
  if (fill === 'none' || !fill) {
    fill = element.getAttribute('fill') || 'none';
  }
  if (stroke === 'none' || !stroke) {
    stroke = element.getAttribute('stroke') || 'none';
  }

  // Priority 3: Computed style (if available)
  if ((fill === 'none' || stroke === 'none') && typeof window !== 'undefined') {
    try {
      const computed = window.getComputedStyle(element as any);
      if (fill === 'none') fill = computed.fill || 'none';
      if (stroke === 'none') stroke = computed.stroke || 'none';
    } catch (e) {
      // Ignore errors in non-browser environments
    }
  }

  // Normalize colors
  fill = normalizeColor(fill);
  stroke = normalizeColor(stroke);

  return { fill, stroke };
}

/**
 * Normalize color values (convert rgb to hex, handle 'none', etc.)
 */
function normalizeColor(color: string): string {
  if (!color || color === 'none' || color === 'transparent') {
    return 'none';
  }

  // Convert rgb/rgba to hex
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return color;
}

// ============================================================================
// BOUNDS CALCULATION
// ============================================================================

/**
 * Get bounding box for any SVG element (unified calculation)
 */
export function getElementBounds(element: Element): Bounds {
  const tagName = element.tagName.toLowerCase();

  try {
    // Try getBBox if available (most accurate)
    if ('getBBox' in element && typeof (element as any).getBBox === 'function') {
      const bbox = (element as any).getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    }
  } catch (e) {
    // getBBox can fail for some elements, fall back to manual calculation
  }

  // Manual calculation based on element type
  switch (tagName) {
    case 'rect':
      return {
        x: parseFloat(element.getAttribute('x') || '0'),
        y: parseFloat(element.getAttribute('y') || '0'),
        width: parseFloat(element.getAttribute('width') || '0'),
        height: parseFloat(element.getAttribute('height') || '0'),
      };

    case 'circle': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const r = parseFloat(element.getAttribute('r') || '0');
      return {
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
      };
    }

    case 'ellipse': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');
      return {
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }

    case 'line': {
      const x1 = parseFloat(element.getAttribute('x1') || '0');
      const y1 = parseFloat(element.getAttribute('y1') || '0');
      const x2 = parseFloat(element.getAttribute('x2') || '0');
      const y2 = parseFloat(element.getAttribute('y2') || '0');
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
    }

    case 'polyline':
    case 'polygon': {
      const points = parsePoints(element.getAttribute('points') || '');
      return getPointsBounds(points);
    }

    case 'path': {
      const points = parsePathPoints(element.getAttribute('d') || '');
      return getPointsBounds(points);
    }

    case 'text':
    case 'tspan': {
      const x = parseFloat(element.getAttribute('x') || '0');
      const y = parseFloat(element.getAttribute('y') || '0');
      const fontSize = parseFontSize(element);
      const textLength = element.textContent?.length || 0;
      return {
        x,
        y: y - fontSize,
        width: textLength * fontSize * 0.6, // Approximate
        height: fontSize * 1.2,
      };
    }

    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Parse points attribute (for polyline/polygon)
 */
function parsePoints(pointsStr: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const coords = pointsStr.trim().split(/[\s,]+/);

  for (let i = 0; i < coords.length - 1; i += 2) {
    points.push({
      x: parseFloat(coords[i]),
      y: parseFloat(coords[i + 1]),
    });
  }

  return points;
}

/**
 * Parse path data to extract points (simplified)
 */
function parsePathPoints(d: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  
  // Extract all coordinate pairs from path commands
  const coordRegex = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/g;
  let match;

  while ((match = coordRegex.exec(d)) !== null) {
    points.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    });
  }

  return points;
}

/**
 * Calculate bounding box from array of points
 */
function getPointsBounds(points: Array<{ x: number; y: number }>): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ============================================================================
// NODE/EDGE DETECTION HEURISTICS
// ============================================================================

/**
 * Heuristic to identify if an element represents a network node
 * Criteria: Has fill, significant area, not a connector line
 */
export function isNodeElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();

  // Text elements are not nodes
  if (tagName === 'text' || tagName === 'tspan') {
    return false;
  }

  // Lines are typically edges, not nodes
  if (tagName === 'line') {
    return false;
  }

  const colors = extractColorInfo(element);
  const bounds = getElementBounds(element);
  const area = bounds.width * bounds.height;

  // Must have a fill color (nodes are typically filled shapes)
  const hasFill = colors.fill !== 'none' && colors.fill !== 'transparent';

  // Must have significant area
  const hasSignificantArea = area >= MINIMUM_NODE_AREA_THRESHOLD;

  // Polylines/paths with no fill are likely edges
  if ((tagName === 'polyline' || tagName === 'path') && !hasFill) {
    return false;
  }

  return hasFill && hasSignificantArea;
}

/**
 * Heuristic to identify if an element represents a network edge/connection
 * Criteria: Has stroke but no fill, line-like shape
 */
export function isEdgeElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();

  // Lines are always edges
  if (tagName === 'line') {
    return true;
  }

  // Text elements are not edges
  if (tagName === 'text' || tagName === 'tspan') {
    return false;
  }

  const colors = extractColorInfo(element);
  const strokeWidth = parseFloat(element.getAttribute('stroke-width') || '1');

  // Must have stroke
  const hasStroke = colors.stroke !== 'none' && strokeWidth >= MINIMUM_EDGE_STROKE_WIDTH;

  // Should not have fill (or fill should be none/transparent)
  const noFill = colors.fill === 'none' || colors.fill === 'transparent';

  // Polylines and paths with stroke but no fill are edges
  if ((tagName === 'polyline' || tagName === 'path') && hasStroke && noFill) {
    return true;
  }

  // Rectangles with very high aspect ratio might be lines
  if (tagName === 'rect') {
    const bounds = getElementBounds(element);
    const aspectRatio = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
    if (aspectRatio > 10 && hasStroke) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

/**
 * Extract all text elements with their positions
 */
export function extractTextElements(doc: Document): TextElement[] {
  const textElements: TextElement[] = [];
  const texts = doc.querySelectorAll('text, tspan');

  texts.forEach(element => {
    const text = element.textContent?.trim() || '';
    if (!text) return;

    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const fontSize = parseFontSize(element);

    textElements.push({ text, x, y, fontSize, element });
  });

  return textElements;
}

/**
 * Parse font size from element
 */
function parseFontSize(element: Element): number {
  // Check style attribute
  const style = element.getAttribute('style');
  if (style) {
    const match = style.match(/font-size:\s*(\d+\.?\d*)/);
    if (match) return parseFloat(match[1]);
  }

  // Check font-size attribute
  const fontSize = element.getAttribute('font-size');
  if (fontSize) return parseFloat(fontSize);

  // Default
  return 12;
}

// ============================================================================
// NODE PARSING
// ============================================================================

/**
 * Parse node elements into ParsedNode objects
 */
function parseNodes(nodeElements: ExtractedElement[]): ParsedNode[] {
  return nodeElements.map((el, index) => {
    const element = el.element;
    const bounds = getElementBounds(element);
    const colors = extractColorInfo(element);
    const shape = detectShapeType(element) as ParsedNode['shape'];

    return {
      id: element.getAttribute('id') || `node-${index}`,
      label: '', // Will be filled by associateLabelsToNodes
      shape,
      bounds,
      fillColor: colors.fill,
      strokeColor: colors.stroke,
      rawElement: element.outerHTML,
    };
  });
}

// ============================================================================
// LABEL ASSOCIATION
// ============================================================================

/**
 * Associate text labels with nodes based on proximity
 */
export function associateLabelsToNodes(nodes: ParsedNode[], texts: TextElement[]): void {
  // Track which texts have been assigned
  const assignedTexts = new Set<TextElement>();

  for (const node of nodes) {
    // Find closest unassigned text within threshold
    let closestText: TextElement | null = null;
    let closestDistance = LABEL_PROXIMITY_THRESHOLD;

    for (const text of texts) {
      if (assignedTexts.has(text)) continue;

      const distance = distanceToNode(text.x, text.y, node);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestText = text;
      }
    }

    if (closestText) {
      node.label = closestText.text;
      node.fontSize = closestText.fontSize;
      assignedTexts.add(closestText);
    }
  }
}

/**
 * Calculate distance from a point to the nearest edge of a node's bounds
 */
function distanceToNode(x: number, y: number, node: ParsedNode): number {
  const { bounds } = node;

  // Check if point is inside the node
  if (x >= bounds.x && x <= bounds.x + bounds.width &&
      y >= bounds.y && y <= bounds.y + bounds.height) {
    return 0;
  }

  // Calculate distance to nearest edge
  const dx = Math.max(bounds.x - x, 0, x - (bounds.x + bounds.width));
  const dy = Math.max(bounds.y - y, 0, y - (bounds.y + bounds.height));

  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// EDGE PARSING
// ============================================================================

/**
 * Parse edge elements into ParsedEdge objects
 */
function parseEdges(edgeElements: ExtractedElement[]): ParsedEdge[] {
  return edgeElements.map((el, index) => {
    const element = el.element;
    const colors = extractColorInfo(element);
    const strokeWidth = parseFloat(element.getAttribute('stroke-width') || '1');
    const strokeDasharray = element.getAttribute('stroke-dasharray') || undefined;
    const points = extractEdgePoints(element);
    const arrowMarker = detectArrowMarker(element);

    return {
      id: element.getAttribute('id') || `edge-${index}`,
      sourceNodeId: null, // Will be filled by resolveEdgeEndpoints
      targetNodeId: null, // Will be filled by resolveEdgeEndpoints
      strokeColor: colors.stroke,
      strokeWidth,
      strokeDasharray,
      points,
      arrowMarker,
    };
  });
}

/**
 * Extract points from edge element
 */
function extractEdgePoints(element: Element): Array<{ x: number; y: number }> {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'line':
      return [
        { x: parseFloat(element.getAttribute('x1') || '0'), y: parseFloat(element.getAttribute('y1') || '0') },
        { x: parseFloat(element.getAttribute('x2') || '0'), y: parseFloat(element.getAttribute('y2') || '0') },
      ];

    case 'polyline':
    case 'polygon':
      return parsePoints(element.getAttribute('points') || '');

    case 'path':
      return parsePathPoints(element.getAttribute('d') || '');

    default:
      return [];
  }
}

/**
 * Detect arrow markers on edges
 */
function detectArrowMarker(element: Element): 'start' | 'end' | 'both' | undefined {
  const markerStart = element.getAttribute('marker-start');
  const markerEnd = element.getAttribute('marker-end');

  if (markerStart && markerEnd) return 'both';
  if (markerStart) return 'start';
  if (markerEnd) return 'end';

  // Check in style attribute
  const style = element.getAttribute('style') || '';
  const hasStartMarker = /marker-start/.test(style);
  const hasEndMarker = /marker-end/.test(style);

  if (hasStartMarker && hasEndMarker) return 'both';
  if (hasStartMarker) return 'start';
  if (hasEndMarker) return 'end';

  return undefined;
}

// ============================================================================
// EDGE ENDPOINT RESOLUTION
// ============================================================================

/**
 * Resolve edge endpoints to connect to nodes
 */
export function resolveEdgeEndpoints(edges: ParsedEdge[], nodes: ParsedNode[]): void {
  edges.forEach(edge => {
    if (edge.points.length < 2) return;

    const startPoint = edge.points[0];
    const endPoint = edge.points[edge.points.length - 1];

    // Find nodes at or near endpoints
    edge.sourceNodeId = findNodeAtPoint(startPoint, nodes)?.id || 
                        findNearestNode(startPoint.x, startPoint.y, nodes)?.id || 
                        null;

    edge.targetNodeId = findNodeAtPoint(endPoint, nodes)?.id || 
                        findNearestNode(endPoint.x, endPoint.y, nodes)?.id || 
                        null;
  });
}

/**
 * Calculate distance from a point to the center of a node
 */
function distanceToNodeCenter(x: number, y: number, node: ParsedNode): number {
  const centerX = node.bounds.x + node.bounds.width / 2;
  const centerY = node.bounds.y + node.bounds.height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the nearest node to a point (within threshold)
 */
export function findNearestNode(x: number, y: number, nodes: ParsedNode[]): ParsedNode | null {
  let nearestNode: ParsedNode | null = null;
  let nearestDistance = ENDPOINT_SNAP_THRESHOLD;

  nodes.forEach(node => {
    const distance = distanceToNodeCenter(x, y, node);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNode = node;
    }
  });

  return nearestNode;
}

/**
 * Find node that overlaps a specific point
 */
export function findNodeAtPoint(point: { x: number; y: number }, nodes: ParsedNode[]): ParsedNode | null {
  return nodes.find(node => {
    const { bounds } = node;
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }) || null;
}

// Made with Bob
