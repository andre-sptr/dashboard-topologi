import type { RawNode } from './googleSlidesSvgParser';
import type { RawEdge } from './edgeParser';

export type NodeType = 'pop' | 'router' | 'switch' | 'server' | 'firewall' | 'load-balancer';
export type EdgeType = 'fiber' | 'ethernet' | 'wireless' | 'vpn';

interface InferenceRule {
  name: string;
  priority: number;
  match: (node: RawNode & { label?: string }) => boolean;
  result: NodeType;
}


const INFERENCE_RULES: InferenceRule[] = [
  // Berdasarkan label text
  { name: 'label-router',    priority: 10, match: n => /router|RTR|PE-|AGG|CORE/i.test(n.label || ''),       result: 'router' },
  { name: 'label-switch',    priority: 10, match: n => /switch|SW|BTM-|ASW|DSW/i.test(n.label || ''),        result: 'switch' },
  { name: 'label-pop',       priority: 10, match: n => /POP|BTN|[A-Z]{3}[AB]$|SITE|HUB/i.test(n.label || ''), result: 'pop' },
  { name: 'label-server',    priority: 10, match: n => /server|CDN|BB|HOST|SRV|DB/i.test(n.label || ''),          result: 'server' },
  { name: 'label-firewall',  priority: 10, match: n => /FW|firewall|WAG|WAC|PCEF|SEC/i.test(n.label || ''), result: 'firewall' },
  
  // Berdasarkan warna fill (Google Slides network icons are images, so we skip color check for them)
  
  // Berdasarkan shape (skip cylinder/diamond as they are now images)
  { name: 'shape-rect',     priority: 1, match: _ => true,             result: 'router' }, // Default
];

/**
 * Infer node type from its visual and textual properties
 */
export const inferNodeType = (node: RawNode & { label?: string }): NodeType => {
  const matchingRules = INFERENCE_RULES
    .filter(rule => rule.match(node))
    .sort((a, b) => b.priority - a.priority);
  
  return (matchingRules[0]?.result as NodeType) ?? 'pop';
};

/**
 * Infer edge type from its stroke properties
 */
export const inferEdgeType = (edge: RawEdge): EdgeType => {
  if (edge.isDashed) return 'ethernet'; // dashed biasanya secondary/backup/ethernet
  if (edge.strokeWidth > 2.5) return 'fiber';    // thick line = fiber backbone
  return 'ethernet';
};
