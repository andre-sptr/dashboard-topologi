import { describe, it, expect } from 'vitest';
import { extractNodes, extractLabelRegions } from './googleSlidesSvgParser';
import { parseEdgePath } from './edgeParser';

describe('Edge Parser Bezier Math', () => {
  it('should calculate absolute endpoints for relative bezier paths', () => {
    // Example from Plan v2:
    // m887.49 553.69 c0 265.79 242.25 531.59 484.50 531.59
    const d = 'm887.49 553.69 c0 265.79 242.25 531.59 484.50 531.59';
    const endpoints = parseEdgePath(d);
    
    expect(endpoints).not.toBeNull();
    if (endpoints) {
      expect(endpoints.start.x).toBe(887.49);
      expect(endpoints.start.y).toBe(553.69);
      expect(endpoints.end.x).toBeCloseTo(887.49 + 484.50, 2);
      expect(endpoints.end.y).toBeCloseTo(553.69 + 531.59, 2);
    }
  });

  it('should handle multiple relative segments', () => {
    const d = 'm10 10 l 5 5 c 1 1 2 2 10 10';
    const endpoints = parseEdgePath(d);
    
    expect(endpoints).not.toBeNull();
    if (endpoints) {
      expect(endpoints.start.x).toBe(10);
      expect(endpoints.start.y).toBe(10);
      // 10 + 5 + 10 = 25
      expect(endpoints.end.x).toBe(25);
      // 10 + 5 + 10 = 25
      expect(endpoints.end.y).toBe(25);
    }
  });
});

describe('Google Slides SVG Parser v2 - Label Regions', () => {
  it('should extract label regions from invisible bboxes', () => {
    const mockSvg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <path fill="#000000" fill-opacity="0.0" d="m100 100 l 50 0 l 0 20 l -50 0 z" />
        <path fill="#000000" fill-opacity="0.0" d="m200 200 l 100 0 l 0 25 l -100 0 z" />
      </svg>
    `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(mockSvg, 'image/svg+xml');
    
    const regions = extractLabelRegions(doc);
    expect(regions.length).toBe(2);
    expect(regions[0].x).toBe(100);
    expect(regions[0].width).toBe(50);
    expect(regions[0].height).toBe(20);
    expect(regions[0].cx).toBe(125);
  });
});

describe('Google Slides SVG Parser v2 - Node Extraction', () => {
  it('should extract nodes from matrix transform and image elements', () => {
    const mockSvg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(0.8 0 0 0.8 100 200)">
          <image href="data:image/png;base64,abc" width="100" height="100" />
        </g>
        <g transform="matrix(1 0 0 1 500 600)">
          <image href="data:image/png;base64,def" width="50" height="50" />
        </g>
      </svg>
    `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(mockSvg, 'image/svg+xml');
    
    const nodes = extractNodes(doc);
    expect(nodes.length).toBe(2);
    
    expect(nodes[0].tx).toBe(100);
    expect(nodes[0].ty).toBe(200);
    expect(nodes[0].renderedW).toBe(80); // 0.8 * 100
    expect(nodes[0].cx).toBe(140); // 100 + 40
  });
});
