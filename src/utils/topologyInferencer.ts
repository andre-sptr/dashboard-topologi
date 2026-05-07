import type { ParsedNode, ParsedEdge } from './googleSlidesSvgParser';

export type NodeType = 'pop' | 'router' | 'switch' | 'server' | 'firewall' | 'load-balancer';
export type EdgeType = 'fiber' | 'ethernet' | 'wireless' | 'vpn';

interface InferenceRule {
  name: string;
  priority: number;
  match: (node: ParsedNode) => boolean;
  result: NodeType;
}

// Helper to detect colors
const isBlueish = (color: string) => {
  if (!color || color === 'none') return false;
  // Simple check for blue-ish hex or names
  return /#([0-3][0-9a-f])([0-9a-f]{2})([8-9a-f][0-9a-f])/i.test(color) || 
         color.includes('blue') || color.includes('indigo') || color.includes('cyan');
};

const isGreenish = (color: string) => {
  if (!color || color === 'none') return false;
  return /#([0-9a-f]{2})([8-9a-f][0-9a-f])([0-9a-f]{2})/i.test(color) || 
         color.includes('green') || color.includes('emerald') || color.includes('teal');
};

const isOrange = (color: string) => {
  if (!color || color === 'none') return false;
  return /#(f[a-f])([8-9][0-9a-f])([0-3][0-9a-f])/i.test(color) || 
         color.includes('orange') || color.includes('amber');
};

const isReddish = (color: string) => {
  if (!color || color === 'none') return false;
  return /#([8-9a-f][0-9a-f])([0-3][0-9a-f])([0-3][0-9a-f])/i.test(color) || 
         color.includes('red') || color.includes('rose');
};

// Helper to detect shapes from raw SVG string
const isCylinderShape = (raw: string) => raw.includes('path') && (raw.includes('C') || raw.includes('c'));
const isDiamondShape = (raw: string) => raw.includes('polygon') || (raw.includes('path') && raw.split('L').length === 5);

const INFERENCE_RULES: InferenceRule[] = [
  // Berdasarkan label text
  { name: 'label-router',    priority: 10, match: n => /router|RTR|PE-|AGG|CORE/i.test(n.label),       result: 'router' },
  { name: 'label-switch',    priority: 10, match: n => /switch|SW|BTM-|ASW|DSW/i.test(n.label),        result: 'switch' },
  { name: 'label-pop',       priority: 10, match: n => /POP|BTN|[A-Z]{3}[AB]$|SITE|HUB/i.test(n.label), result: 'pop' },
  { name: 'label-server',    priority: 10, match: n => /server|CDN|BB|HOST|SRV|DB/i.test(n.label),          result: 'server' },
  { name: 'label-firewall',  priority: 10, match: n => /FW|firewall|WAG|WAC|PCEF|SEC/i.test(n.label), result: 'firewall' },
  
  // Berdasarkan warna fill (common network diagram conventions)
  { name: 'color-blue',   priority: 5, match: n => isBlueish(n.fillColor),  result: 'router' },
  { name: 'color-green',  priority: 5, match: n => isGreenish(n.fillColor), result: 'switch' },
  { name: 'color-orange', priority: 5, match: n => isOrange(n.fillColor),   result: 'server' },
  { name: 'color-red',    priority: 5, match: n => isReddish(n.fillColor),  result: 'firewall' },
  
  // Berdasarkan shape
  { name: 'shape-cylinder', priority: 3, match: n => isCylinderShape(n.rawElement), result: 'server' },
  { name: 'shape-diamond',  priority: 3, match: n => isDiamondShape(n.rawElement),  result: 'router' },
  { name: 'shape-circle',   priority: 2, match: n => n.shape === 'circle',           result: 'pop' },
  { name: 'shape-rect',     priority: 1, match: n => n.shape === 'rect',             result: 'switch' },
];

/**
 * Infer node type from its visual and textual properties
 */
export const inferNodeType = (node: ParsedNode): NodeType => {
  const matchingRules = INFERENCE_RULES
    .filter(rule => rule.match(node))
    .sort((a, b) => b.priority - a.priority);
  
  return (matchingRules[0]?.result as NodeType) ?? 'pop';
};

/**
 * Infer edge type from its stroke properties
 */
export const inferEdgeType = (edge: ParsedEdge): EdgeType => {
  if (edge.strokeDasharray) return 'ethernet'; // dashed biasanya secondary/backup/ethernet
  if (edge.strokeWidth > 2.5) return 'fiber';    // thick line = fiber backbone
  return 'ethernet';
};
