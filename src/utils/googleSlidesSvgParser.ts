/**
 * Google Slides SVG Parser v2
 * 
 * Based on byte-per-byte analysis of actual Google Slides SVG exports.
 * Key findings:
 * - Nodes are <image> elements inside <g transform="matrix(...)">
 * - Labels are vectorized into <path> elements (not readable via DOM)
 * - Invisible bboxes (fill-opacity="0.0") mark label positions
 * - Edges are stroked paths with cumulative relative bezier coordinates
 */

import { extractEdges } from './edgeParser';
import type { RawEdge } from './edgeParser';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RawNode {
  id: string;
  tx: number;        // X position (from matrix 5th column)
  ty: number;        // Y position (from matrix 6th column)
  scaleX: number;    // scale from matrix
  scaleY: number;
  renderedW: number; // = scaleX × original image width
  renderedH: number; // = scaleY × original image height
  cx: number;        // center X = tx + renderedW/2
  cy: number;        // center Y = ty + renderedH/2
  imageDataUri: string; // base64 PNG for icon preview
}

export interface LabelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;  // center X
  cy: number;  // center Y
}

export interface ParsedTopologyGraphV2 {
  nodes: RawNode[];
  edges: RawEdge[];
  labelRegions: LabelRegion[];
  viewBox: string;
  originalWidth: number;
  originalHeight: number;
}

// ============================================================================
// NODE EXTRACTION
// ============================================================================

/**
 * Extract nodes from SVG.
 * Google Slides network nodes are <image> elements wrapped in <g transform="matrix(...)">.
 */
export const extractNodes = (svgDoc: Document | Element): RawNode[] => {
  const nodes: RawNode[] = [];
  
  // Cari semua <g> dengan transform="matrix(...)"
  const groups = svgDoc.querySelectorAll('g[transform]');
  
  groups.forEach((g, index) => {
    const transform = g.getAttribute('transform') || '';
    
    // Parse: matrix(a, b, c, d, TX, TY)
    // Example: matrix(0.8437 0.0 0.0 0.8437 803.118 384.943)
    const matrixMatch = transform.match(
      /matrix\(\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*\)/
    );
    if (!matrixMatch) return;
    
    const [, a, , , d, tx, ty] = matrixMatch.map(Number);
    
    // Cari <image> di dalam group ini
    const image = g.querySelector('image');
    if (!image) return; // bukan node, skip
    
    const imgW = parseFloat(image.getAttribute('width') || '0');
    const imgH = parseFloat(image.getAttribute('height') || '0');
    const imageDataUri = image.getAttribute('xlink:href') || image.getAttribute('href') || '';
    
    const renderedW = Math.abs(a) * imgW;
    const renderedH = Math.abs(d) * imgH;
    
    nodes.push({
      id: `node-${index}`,
      tx,
      ty,
      scaleX: a,
      scaleY: d,
      renderedW,
      renderedH,
      cx: tx + renderedW / 2,
      cy: ty + renderedH / 2,
      imageDataUri,
    });
  });
  
  return nodes;
};

// ============================================================================
// LABEL REGION EXTRACTION
// ============================================================================

/**
 * Extract invisible bounding boxes that represent label positions.
 * Pattern: <path fill="#000000" fill-opacity="0.0" d="m X Y l W 0 l 0 H l -W 0 z">
 */
export const extractLabelRegions = (svgDoc: Document | Element): LabelRegion[] => {
  const regions: LabelRegion[] = [];
  
  const invisPaths = svgDoc.querySelectorAll('path[fill="#000000"][fill-opacity="0.0"]');
  
  invisPaths.forEach(path => {
    const d = path.getAttribute('d') || '';
    
    // Parse: "m X Y l W 0 l 0 H l -W 0 z"
    const match = d.match(/m\s*([\d.E+-]+)\s+([\d.E+-]+)\s*l\s*([\d.E+-]+)\s+0\s*l\s*0\s+([\d.E+-]+)/);
    if (!match) return;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const w = parseFloat(match[3]);
    const h = parseFloat(match[4]);
    
    // Filter: too small = probably a spacer, too large = probably slide frame
    if (Math.abs(w) < 10 || Math.abs(h) < 5 || Math.abs(w) > 5000) return;
    
    regions.push({
      x, 
      y, 
      width: Math.abs(w), 
      height: Math.abs(h),
      cx: x + w / 2,
      cy: y + h / 2,
    });
  });
  
  return regions;
};

// ============================================================================
// MAIN PARSER
// ============================================================================

export const parseGoogleSlidesSvgV2 = (svgContent: string): ParsedTopologyGraphV2 => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');
  
  if (!svgElement) {
    throw new Error('Invalid SVG: No <svg> element found');
  }
  
  const viewBox = svgElement.getAttribute('viewBox') || '0 0 1000 1000';
  const width = parseFloat(svgElement.getAttribute('width') || '1000');
  const height = parseFloat(svgElement.getAttribute('height') || '1000');
  
  const nodes = extractNodes(doc);
  const edges = extractEdges(doc);
  const labelRegions = extractLabelRegions(doc);
  
  return {
    nodes,
    edges,
    labelRegions,
    viewBox,
    originalWidth: width,
    originalHeight: height
  };
};
