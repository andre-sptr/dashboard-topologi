# Google Slides SVG Parser

A robust SVG parser specifically designed to understand Google Slides exported SVG structure and extract topology semantics (nodes, edges, labels).

## Overview

This parser is part of Sprint 1, Task 1 of the Network Topology Dashboard implementation. It provides intelligent heuristics to automatically detect network nodes and edges from SVG files exported from Google Slides.

## Features

- ✅ **Node Detection**: Automatically identifies shapes that represent network nodes (routers, switches, servers)
- ✅ **Edge Detection**: Identifies connections between nodes (lines, polylines, paths)
- ✅ **Label Association**: Matches text labels to their corresponding nodes using proximity
- ✅ **Endpoint Resolution**: Connects edges to nodes automatically
- ✅ **Asset Extraction**: Preserves gradients, filters, markers, and patterns for visual fidelity
- ✅ **Google Slides Quirks**: Handles nested groups, transforms, inline styles, and various shape representations

## Usage

### Basic Usage

```typescript
import { parseGoogleSlidesSvg } from './utils/googleSlidesSvgParser';

// Load your SVG content (from file upload, fetch, etc.)
const svgContent = `<svg>...</svg>`;

// Parse the SVG
const result = parseGoogleSlidesSvgParser(svgContent);

// Access parsed data
console.log('Nodes:', result.nodes);
console.log('Edges:', result.edges);
console.log('ViewBox:', result.viewBox);
```

### Return Type

```typescript
interface ParsedTopologyGraph {
  nodes: ParsedNode[];           // Detected network nodes
  edges: ParsedEdge[];           // Detected connections
  viewBox: string;               // SVG viewBox for rendering
  originalBounds: {              // Original SVG dimensions
    width: number;
    height: number;
  };
  rawAssets: Asset[];            // Gradients, filters, markers, etc.
}
```

### Node Structure

```typescript
interface ParsedNode {
  id: string;                    // Unique identifier
  label: string;                 // Associated text label
  shape: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'custom';
  bounds: {                      // Position and size
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fillColor: string;             // Fill color (hex or 'none')
  strokeColor: string;           // Stroke color (hex or 'none')
  fontSize?: number;             // Font size of label (if found)
  rawElement: string;            // Original SVG element HTML
}
```

### Edge Structure

```typescript
interface ParsedEdge {
  id: string;                    // Unique identifier
  sourceNodeId: string | null;   // Connected source node (or null)
  targetNodeId: string | null;   // Connected target node (or null)
  label?: string;                // Optional edge label
  strokeColor: string;           // Line color
  strokeWidth: number;           // Line width
  strokeDasharray?: string;      // Dash pattern (e.g., "5,5")
  points: Array<{                // Path points
    x: number;
    y: number;
  }>;
  arrowMarker?: 'start' | 'end' | 'both';  // Arrow direction
}
```

## Detection Heuristics

### Node Detection

An element is considered a **node** if:
- Has a fill color (not 'none' or 'transparent')
- Has significant area (≥ 100 square units)
- Is not a line element
- Is a filled shape (rect, circle, ellipse, polygon, or filled path)

### Edge Detection

An element is considered an **edge** if:
- Is a line element, OR
- Has stroke but no fill (or transparent fill)
- Is a polyline or path with visible stroke
- Has minimum stroke width (≥ 0.5)

### Label Association

Text labels are associated with nodes using:
- **Proximity threshold**: 50 SVG units
- **Closest match**: Each label is assigned to the nearest unassigned node
- **Distance calculation**: Measures distance to node bounds (0 if inside)

### Endpoint Resolution

Edge endpoints are connected to nodes using:
- **Snap threshold**: 20 SVG units
- **Priority**: First checks for overlapping nodes, then nearest nodes
- **Start/End points**: Connects both endpoints independently

## Configuration Constants

You can modify these constants in the parser for different behavior:

```typescript
MINIMUM_NODE_AREA_THRESHOLD = 100      // Min area for node detection
LABEL_PROXIMITY_THRESHOLD = 50         // Max distance for label association
ENDPOINT_SNAP_THRESHOLD = 20           // Max distance for edge snapping
MINIMUM_EDGE_STROKE_WIDTH = 0.5        // Min stroke width for edges
```

## Supported SVG Elements

### Nodes
- `<rect>` - Rectangles
- `<circle>` - Circles
- `<ellipse>` - Ellipses
- `<polygon>` - Polygons
- `<path>` - Custom paths (with fill)

### Edges
- `<line>` - Straight lines
- `<polyline>` - Multi-segment lines
- `<path>` - Curved or complex paths (without fill)

### Text
- `<text>` - Text labels
- `<tspan>` - Text spans

### Assets
- `<linearGradient>` - Linear gradients
- `<radialGradient>` - Radial gradients
- `<filter>` - SVG filters
- `<marker>` - Arrow markers
- `<pattern>` - Fill patterns
- `<clipPath>` - Clipping paths
- `<mask>` - Masks
- `<style>` - CSS styles

## Google Slides Compatibility

The parser handles common Google Slides export patterns:

1. **Nested Groups**: Traverses `<g>` elements with transforms
2. **Transform Accumulation**: Combines parent and child transforms
3. **Inline Styles**: Parses `style` attributes for colors
4. **Attribute Fallbacks**: Checks attributes if styles not found
5. **Text Positioning**: Handles text elements separate from shapes
6. **Various Shapes**: Supports all common shape types

## Testing

### Browser Test (Recommended)

Open `googleSlidesSvgParser.test.html` in a browser to see visual results:

```bash
# Serve the file with a local server
npx serve src/utils
# Then open http://localhost:3000/googleSlidesSvgParser.test.html
```

### Node.js Test (Limited)

Note: DOMParser is not available in Node.js by default. For Node.js testing, you would need to install a DOM implementation like `jsdom`:

```bash
npm install jsdom
```

## Error Handling

The parser includes comprehensive error handling:

- Returns empty graph on parse errors (doesn't throw)
- Logs warnings for parsing issues
- Handles missing attributes gracefully
- Provides default values for optional properties

## Example: Creating a Network Diagram in Google Slides

1. **Create Nodes**: Draw shapes (rectangles, circles) with fill colors
2. **Add Labels**: Add text boxes near or inside shapes
3. **Draw Connections**: Use lines or connectors between shapes
4. **Add Arrows**: Use line markers or arrow shapes
5. **Export**: File → Download → SVG
6. **Parse**: Use this parser to extract topology data

## Integration with Dashboard

This parser is designed to integrate with the Network Topology Dashboard:

```typescript
// In your upload handler
const handleSvgUpload = async (file: File) => {
  const svgContent = await file.text();
  const parsed = parseGoogleSlidesSvg(svgContent);
  
  // Convert to dashboard format
  const nodes = parsed.nodes.map(node => ({
    id: node.id,
    label: node.label,
    type: inferNodeType(node),  // Your logic
    position: { x: node.bounds.x, y: node.bounds.y, z: 0 },
    // ... other properties
  }));
  
  const edges = parsed.edges.map(edge => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    // ... other properties
  }));
  
  // Update store
  topologyStore.setTopology({ nodes, edges });
};
```

## Limitations

- **Browser Only**: Requires browser DOM APIs (DOMParser, Element)
- **Heuristic-Based**: Detection may not be 100% accurate for all SVG structures
- **Static Analysis**: Doesn't execute JavaScript or handle dynamic SVG
- **Transform Limitations**: Complex transforms may not be fully resolved

## Future Enhancements

Potential improvements for future sprints:

- [ ] Machine learning-based node/edge classification
- [ ] Support for more complex path operations
- [ ] Transform matrix calculations for accurate positioning
- [ ] Node type inference from shape/color patterns
- [ ] Edge routing optimization
- [ ] Support for grouped/hierarchical topologies

## API Reference

### Main Functions

#### `parseGoogleSlidesSvg(svgContent: string): ParsedTopologyGraph`
Main entry point for parsing SVG content.

#### `detectShapeType(element: Element): string`
Identifies the shape type of an SVG element.

#### `extractColorInfo(element: Element): ColorInfo`
Extracts fill and stroke colors from element.

#### `getElementBounds(element: Element): Bounds`
Calculates bounding box for any SVG element.

#### `isNodeElement(element: Element): boolean`
Heuristic to identify network nodes.

#### `isEdgeElement(element: Element): boolean`
Heuristic to identify network edges.

#### `extractTextElements(doc: Document): TextElement[]`
Extracts all text elements with positions.

#### `associateLabelsToNodes(nodes, texts): void`
Associates text labels with nodes.

#### `resolveEdgeEndpoints(edges, nodes): void`
Connects edge endpoints to nodes.

#### `findNearestNode(x, y, nodes): ParsedNode | null`
Finds closest node to a point.

#### `findNodeAtPoint(point, nodes): ParsedNode | null`
Finds node overlapping a point.

## License

Part of the Network Topology Dashboard project.

## Author

Created as part of Sprint 1, Task 1 implementation.