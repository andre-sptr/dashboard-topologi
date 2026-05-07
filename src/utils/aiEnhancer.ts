import type { NodeType, EdgeType } from './topologyInferencer';
import { GoogleGenAI } from '@google/genai';

export type NodeStatus = 'online' | 'offline' | 'warning' | 'error';
export type ConnectionType = 'primary' | 'backup' | 'load-balanced';

export interface AIEnhancementRequest {
  nodes: Array<{
    id: string;
    label: string;
    inferredType: NodeType;
    fillColor: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    sourceId: string | null;
    targetId: string | null;
    label?: string;
    isDashed: boolean;
  }>;
  contextHint?: string;
}

export interface AIEnhancementResult {
  nodes: Array<{
    id: string;
    confirmedType: NodeType;
    status: NodeStatus;
    data: {
      description: string;
      vendor?: string;
      location?: string;
      estimatedBandwidth?: number;
    };
  }>;
  edges: Array<{
    id: string;
    confirmedType: EdgeType;
    connectionType: ConnectionType;
    data: {
      estimatedLatency: number;
      estimatedUtilization: number;
      protocol?: string;
    };
  }>;
  networkSummary: string;
}

/**
 * Sends the parsed graph to AI for semantic enrichment
 */
export const enhanceWithAI = async (
  request: AIEnhancementRequest,
  apiKey?: string
): Promise<AIEnhancementResult> => {
  const effectiveApiKey = apiKey || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

  if (!effectiveApiKey) {
    console.warn('AI Enhancement: No Gemini API key provided, returning default enhancement');
    return getDefaultEnhancement(request);
  }

  const genAI = new GoogleGenAI({
    vertexai: true,
    apiKey: effectiveApiKey
  });

  const prompt = buildEnhancementPrompt(request);

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt
    });

    const text = result.text || '';
    return parseAIResponse(text);
  } catch (error) {
    console.error('Gemini AI Enhancement failed:', error);
    return getDefaultEnhancement(request);
  }
};

const buildEnhancementPrompt = (req: AIEnhancementRequest): string => `
You are a network topology expert. Analyze this network diagram structure and provide enriched metadata.

NODES (${req.nodes.length} total):
${req.nodes.map(n => `- ID: ${n.id}, Label: "${n.label}", Inferred type: ${n.inferredType}, Color: ${n.fillColor}`).join('\n')}

CONNECTIONS (${req.edges.length} total):
${req.edges.map(e => `- ${e.sourceId ?? '?'} → ${e.targetId ?? '?'}, Label: "${e.label ?? ''}", Dashed: ${e.isDashed}`).join('\n')}

${req.contextHint ? `Context Hint from user: ${req.contextHint}` : ''}

For each node and edge, provide enriched metadata in this EXACT JSON format:
{
  "nodes": [
    {
      "id": "...",
      "confirmedType": "pop|router|switch|server|firewall|load-balancer",
      "status": "online|offline|warning|error",
      "data": {
        "description": "...",
        "vendor": "Cisco|Juniper|Huawei|Nokia|MikroTik|Dell|HP",
        "location": "Jakarta|Singapore|Data Center|etc",
        "estimatedBandwidth": 1000
      }
    }
  ],
  "edges": [
    {
      "id": "...",
      "confirmedType": "fiber|ethernet|wireless|vpn",
      "connectionType": "primary|backup|load-balanced",
      "data": {
        "estimatedLatency": 2,
        "estimatedUtilization": 45,
        "protocol": "BGP|OSPF|MPLS|VLAN"
      }
    }
  ],
  "networkSummary": "Professional summary of this network topology"
}

Respond with ONLY the JSON block, no other conversational text.
`;

const parseAIResponse = (text: string): AIEnhancementResult => {
  try {
    // Extract JSON if AI wrapped it in markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse AI JSON response:', e);
    throw new Error('Invalid AI response format');
  }
};

/**
 * Fallback enhancement logic when AI is unavailable
 */
const getDefaultEnhancement = (req: AIEnhancementRequest): AIEnhancementResult => {
  return {
    nodes: req.nodes.map(n => ({
      id: n.id,
      confirmedType: n.inferredType,
      status: 'online',
      data: {
        description: `Network ${n.inferredType} - ${n.label}`,
        location: 'Detected'
      }
    })),
    edges: req.edges.map(e => ({
      id: e.id,
      confirmedType: e.isDashed ? 'ethernet' : 'fiber',
      connectionType: e.isDashed ? 'backup' : 'primary',
      data: {
        estimatedLatency: e.isDashed ? 15 : 2,
        estimatedUtilization: 30
      }
    })),
    networkSummary: 'Network topology parsed from SVG. AI enrichment skipped or failed.'
  };
};
