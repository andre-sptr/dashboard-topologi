/**
 * Test file for Google Slides SVG Parser
 * 
 * This file contains basic tests to verify the parser functionality.
 * Run with: npm test (if test framework is configured)
 */

import { parseGoogleSlidesSvg } from './googleSlidesSvgParser';

// Sample Google Slides-style SVG with nodes and edges
const sampleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#000" />
    </marker>
  </defs>
  
  <!-- Node 1: Router (rectangle with fill) -->
  <g id="node1-group" transform="translate(100, 100)">
    <rect id="node1" x="0" y="0" width="120" height="80" 
          fill="#4A90E2" stroke="#2E5C8A" stroke-width="2" rx="5"/>
    <text x="60" y="45" text-anchor="middle" font-size="14" fill="#fff">Router A</text>
  </g>
  
  <!-- Node 2: Switch (circle with fill) -->
  <g id="node2-group" transform="translate(400, 100)">
    <circle id="node2" cx="50" cy="40" r="40" 
            fill="#50C878" stroke="#2E7D4E" stroke-width="2"/>
    <text x="50" y="45" text-anchor="middle" font-size="14" fill="#fff">Switch B</text>
  </g>
  
  <!-- Node 3: Server (ellipse with fill) -->
  <g id="node3-group" transform="translate(250, 350)">
    <ellipse id="node3" cx="60" cy="40" rx="70" ry="45" 
             fill="#FF6B6B" stroke="#C92A2A" stroke-width="2"/>
    <text x="60" y="45" text-anchor="middle" font-size="14" fill="#fff">Server C</text>
  </g>
  
  <!-- Edge 1: Connection from Router to Switch (line with stroke, no fill) -->
  <line id="edge1" x1="220" y1="140" x2="400" y2="140" 
        stroke="#333" stroke-width="3" marker-end="url(#arrow)"/>
  
  <!-- Edge 2: Connection from Router to Server (polyline) -->
  <polyline id="edge2" points="160,180 160,250 310,350" 
            fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Edge 3: Connection from Switch to Server (path) -->
  <path id="edge3" d="M 450 180 Q 450 250 310 390" 
        fill="none" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>
</svg>
`;

// Test the parser
console.log('Testing Google Slides SVG Parser...\n');

try {
  const result = parseGoogleSlidesSvg(sampleSVG);
  
  console.log('✓ Parser executed successfully\n');
  
  console.log('=== PARSED RESULTS ===\n');
  
  console.log(`ViewBox: ${result.viewBox}`);
  console.log(`Original Bounds: ${result.originalBounds.width}x${result.originalBounds.height}\n`);
  
  console.log(`Assets Found: ${result.rawAssets.length}`);
  result.rawAssets.forEach((asset, i) => {
    console.log(`  ${i + 1}. ${asset.type}${asset.id ? ` (id: ${asset.id})` : ''}`);
  });
  console.log();
  
  console.log(`Nodes Found: ${result.nodes.length}`);
  result.nodes.forEach((node, i) => {
    console.log(`  ${i + 1}. ${node.id}`);
    console.log(`     Label: "${node.label}"`);
    console.log(`     Shape: ${node.shape}`);
    console.log(`     Position: (${node.bounds.x.toFixed(1)}, ${node.bounds.y.toFixed(1)})`);
    console.log(`     Size: ${node.bounds.width.toFixed(1)}x${node.bounds.height.toFixed(1)}`);
    console.log(`     Fill: ${node.fillColor}, Stroke: ${node.strokeColor}`);
  });
  console.log();
  
  console.log(`Edges Found: ${result.edges.length}`);
  result.edges.forEach((edge, i) => {
    console.log(`  ${i + 1}. ${edge.id}`);
    console.log(`     Source: ${edge.sourceNodeId || 'unconnected'}`);
    console.log(`     Target: ${edge.targetNodeId || 'unconnected'}`);
    console.log(`     Points: ${edge.points.length}`);
    console.log(`     Stroke: ${edge.strokeColor} (width: ${edge.strokeWidth})`);
    if (edge.strokeDasharray) {
      console.log(`     Dash: ${edge.strokeDasharray}`);
    }
    if (edge.arrowMarker) {
      console.log(`     Arrow: ${edge.arrowMarker}`);
    }
  });
  console.log();
  
  // Validation checks
  console.log('=== VALIDATION ===\n');
  
  const checks = [
    { name: 'Has nodes', pass: result.nodes.length > 0 },
    { name: 'Has edges', pass: result.edges.length > 0 },
    { name: 'Has assets', pass: result.rawAssets.length > 0 },
    { name: 'Nodes have labels', pass: result.nodes.some(n => n.label.length > 0) },
    { name: 'Nodes have bounds', pass: result.nodes.every(n => n.bounds.width > 0 && n.bounds.height > 0) },
    { name: 'Edges have points', pass: result.edges.every(e => e.points.length >= 2) },
    { name: 'Some edges connected', pass: result.edges.some(e => e.sourceNodeId || e.targetNodeId) },
  ];
  
  checks.forEach(check => {
    console.log(`${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  
  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✓ All checks passed!' : '✗ Some checks failed'}`);
  
} catch (error) {
  console.error('✗ Parser failed with error:', error);
}

// Made with Bob
