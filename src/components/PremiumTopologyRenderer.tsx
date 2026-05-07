import React from 'react';
import { motion } from 'framer-motion';
import type { NodeType, EdgeType } from '../utils/topologyInferencer';
import type { NodeStatus, ConnectionType } from '../utils/aiEnhancer';

interface PremiumNodeProps {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  x: number;
  y: number;
  data: any;
}

interface PremiumEdgeProps {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  type: EdgeType;
  connectionType: ConnectionType;
  data: any;
}

interface PremiumTopologyRendererProps {
  viewBox: string;
  nodes: PremiumNodeProps[];
  edges: PremiumEdgeProps[];
  onNodeClick?: (nodeId: string) => void;
}

// Visual configurations for different node types
const NODE_VISUAL_CONFIG: Record<NodeType, any> = {
  router: {
    gradient: ['#1e40af', '#3b82f6'],
    glowColor: 'rgba(59,130,246,0.4)',
    icon: '⬡',
    size: { w: 80, h: 80 },
  },
  switch: {
    gradient: ['#065f46', '#10b981'],
    glowColor: 'rgba(16,185,129,0.3)',
    icon: '▤',
    size: { w: 90, h: 50 },
  },
  pop: {
    gradient: ['#4338ca', '#6366f1'],
    glowColor: 'rgba(99,102,241,0.4)',
    icon: '●',
    size: { w: 60, h: 60 },
  },
  server: {
    gradient: ['#92400e', '#f59e0b'],
    glowColor: 'rgba(245,158,11,0.3)',
    icon: '⬛',
    size: { w: 60, h: 80 },
  },
  firewall: {
    gradient: ['#7f1d1d', '#ef4444'],
    glowColor: 'rgba(239,68,68,0.4)',
    icon: '🛡',
    size: { w: 70, h: 80 },
  },
  'load-balancer': {
    gradient: ['#4c1d95', '#8b5cf6'],
    glowColor: 'rgba(139,92,246,0.3)',
    icon: '⇄',
    size: { w: 100, h: 50 },
  },
};

const EDGE_COLORS: Record<EdgeType, string> = {
  fiber: '#3b82f6',
  ethernet: '#64748b',
  wireless: '#10b981',
  vpn: '#8b5cf6',
};

const StatusIndicator = ({ status, cx, cy }: { status: NodeStatus; cx: number; cy: number }) => {
  const colors: Record<NodeStatus, string> = {
    online: '#10b981',
    offline: '#475569',
    warning: '#f59e0b',
    error: '#ef4444',
  };
  const color = colors[status];
  
  return (
    <g>
      {status === 'online' && (
        <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.3}>
          <animate attributeName="r" from={6} to={14} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" from={0.4} to={0} dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={1.5} />
    </g>
  );
};

const PremiumNode = ({ node, onClick }: { node: PremiumNodeProps; onClick?: () => void }) => {
  const config = NODE_VISUAL_CONFIG[node.type] || NODE_VISUAL_CONFIG.pop;
  const { w, h } = config.size;
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ filter: `drop-shadow(0 0 8px ${config.glowColor})` }}
    >
      {/* Node Shape */}
      <rect
        x={node.x}
        y={node.y}
        width={w}
        height={h}
        rx={node.type === 'switch' ? 4 : 12}
        fill={`url(#grad-${node.type})`}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
      
      {/* Icon/Symbol */}
      <text
        x={node.x + w / 2}
        y={node.y + h / 2 + 5}
        textAnchor="middle"
        fill="white"
        fontSize={20}
        className="pointer-events-none opacity-80"
      >
        {config.icon}
      </text>
      
      {/* Label */}
      <text
        x={node.x + w / 2}
        y={node.y + h + 20}
        textAnchor="middle"
        fill="#cbd5e1"
        fontSize={12}
        fontWeight="600"
        className="pointer-events-none"
      >
        {node.label}
      </text>

      {/* Status Dot */}
      <StatusIndicator status={node.status} cx={node.x + w} cy={node.y} />
    </motion.g>
  );
};

const PremiumEdge = ({ edge }: { edge: PremiumEdgeProps }) => {
  const { sourcePos, targetPos, type, connectionType } = edge;
  const pathId = `edge-path-${edge.id}`;
  const status = edge.data?.status || 'online';
  
  // Simple straight line for now, can be improved to Bezier
  const d = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
  
  const edgeColor = EDGE_COLORS[type as EdgeType] || EDGE_COLORS.ethernet;
  const isDashed = connectionType === 'backup';
  const isActive = status !== 'offline';

  return (
    <g>
      {/* Glow path */}
      <path
        d={d}
        stroke={edgeColor}
        strokeWidth={6}
        strokeOpacity={0.1}
        fill="none"
      />
      
      {/* Main path */}
      <path
        id={pathId}
        d={d}
        stroke={edgeColor}
        strokeWidth={isDashed ? 1.5 : 2.5}
        strokeDasharray={isDashed ? '8 6' : undefined}
        fill="none"
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      
      {/* Animation particles */}
      {isActive && (
        <circle r={3} fill={edgeColor}>
          <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
};

const PremiumTopologyRenderer: React.FC<PremiumTopologyRendererProps> = ({
  viewBox,
  nodes,
  edges,
  onNodeClick
}) => {
  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative rounded-3xl border border-slate-800 shadow-2xl">
      <svg
        viewBox={viewBox}
        className="w-full h-full select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {Object.entries(NODE_VISUAL_CONFIG).map(([type, config]: [any, any]) => (
            <linearGradient id={`grad-${type}`} key={type} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.gradient[0]} />
              <stop offset="100%" stopColor={config.gradient[1]} />
            </linearGradient>
          ))}
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges Layer */}
        <g className="edges-layer">
          {edges.map(edge => (
            <PremiumEdge key={edge.id} edge={edge} />
          ))}
        </g>

        {/* Nodes Layer */}
        <g className="nodes-layer">
          {nodes.map(node => (
            <PremiumNode
              key={node.id}
              node={node}
              onClick={() => onNodeClick?.(node.id)}
            />
          ))}
        </g>
      </svg>
      
      {/* Legend / Overlay */}
      <div className="absolute bottom-6 left-6 flex gap-4 p-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-300 font-medium">Real-time Data</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="text-xs text-slate-400">
          Nodes: <span className="text-white font-bold">{nodes.length}</span>
        </div>
        <div className="text-xs text-slate-400">
          Links: <span className="text-white font-bold">{edges.length}</span>
        </div>
      </div>
    </div>
  );
};

export default PremiumTopologyRenderer;
