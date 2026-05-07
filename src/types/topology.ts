import { Vector3 } from 'three';

// Node Types
export type NodeType = 'pop' | 'router' | 'switch' | 'server' | 'firewall' | 'load-balancer';

export type NodeStatus = 'online' | 'offline' | 'warning' | 'error';

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  status: NodeStatus;
  position: {
    x: number;
    y: number;
    z: number;
  };
  data: {
    ip?: string;
    location?: string;
    uptime?: string;
    cpu?: number;
    memory?: number;
    bandwidth?: number;
    connections?: number;
    description?: string;
    vendor?: string;
    model?: string;
    firmware?: string;
    lastSeen?: string;
  };
  color?: string;
  size?: number;
  imageDataUri?: string; // For embedded SVG icons from Google Slides
  metadata?: Record<string, any>;
}

// Edge Types
export type EdgeType = 'fiber' | 'ethernet' | 'wireless' | 'vpn';

export type ConnectionType = 'primary' | 'backup' | 'load-balanced';

export type EdgeStatus = 'active' | 'inactive' | 'degraded' | 'error';

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  connectionType: ConnectionType;
  status: EdgeStatus;
  data: {
    bandwidth?: string;
    latency?: number;
    packetLoss?: number;
    utilization?: number;
    protocol?: string;
    vlan?: string;
    description?: string;
  };
  animated?: boolean;
  color?: string;
  width?: number;
  metadata?: Record<string, any>;
}

// Network Statistics
export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  totalEdges: number;
  activeEdges: number;
  averageLatency: number;
  totalBandwidth: number;
  utilizationPercentage: number;
  healthScore: number;
  alerts: number;
  warnings: number;
}

// Filter Options
export interface FilterOptions {
  nodeTypes: NodeType[];
  edgeTypes: EdgeType[];
  statuses: NodeStatus[];
  showOffline: boolean;
  showWarnings: boolean;
  minBandwidth?: number;
  maxLatency?: number;
}

// View Modes
export type ViewMode = '2d' | '3d' | 'hybrid';

export type LayoutType = 'force' | 'hierarchical' | 'circular' | 'grid' | 'custom';

// Search and Selection
export interface SearchResult {
  node: Node;
  score: number;
  matchedFields: string[];
}

export interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
}

// Camera and View Settings
export interface CameraSettings {
  position: Vector3;
  target: Vector3;
  fov: number;
  zoom: number;
}

export interface ViewSettings {
  mode: ViewMode;
  layout: LayoutType;
  showLabels: boolean;
  showStats: boolean;
  showGrid: boolean;
  enablePhysics: boolean;
  animationSpeed: number;
  nodeScale: number;
  edgeOpacity: number;
}

// Topology Data Structure
export interface TopologyData {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
    lastUpdated?: string;
    author?: string;
  };
}

// Alert and Notification Types
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  nodeId?: string;
  edgeId?: string;
  timestamp: string;
  acknowledged: boolean;
}

// Performance Metrics
export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
  memoryUsage: number;
}

// Export/Import Types
export interface ExportOptions {
  format: 'json' | 'png' | 'svg' | 'pdf';
  includeMetadata: boolean;
  includeStats: boolean;
  resolution?: number;
}

// Theme and Styling
export interface ThemeColors {
  background: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  border: string;
}

export type NodeStyleConfig = {
  [key in NodeType]: {
    color: string;
    icon: string;
    size: number;
  };
};

export type EdgeStyleConfig = {
  [key in EdgeType]: {
    color: string;
    width: number;
    dashArray?: string;
  };
};

// Made with Bob
