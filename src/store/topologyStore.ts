import { create } from 'zustand';
import type {
  Node,
  Edge,
  FilterOptions,
  ViewMode,
  NetworkStats,
  SelectionState,
  ViewSettings,
  Alert,
  LayoutType,
} from '../types/topology';

interface TopologyStore {
  // Data State
  nodes: Node[];
  edges: Edge[];
  
  // Selection State
  selection: SelectionState;
  
  // Filter State
  filters: FilterOptions;
  searchQuery: string;
  
  // View State
  viewMode: ViewMode;
  viewSettings: ViewSettings;
  
  // Statistics
  stats: NetworkStats;
  
  // Alerts
  alerts: Alert[];
  
  // Loading State
  isLoading: boolean;
  error: string | null;
  uploadedSvg: string | null;
  currentTopologyId: string | null;
  topologyElements: any[];
  topologyAssets: any[];
  viewBox: string;
  isEnhanced: boolean;
  enhancedData: any | null;
  networkSummary: string | null;
  
  // Actions - Data Management
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setUploadedSvg: (svg: string | null) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  removeEdge: (id: string) => void;
  
  // Actions - Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  hoverEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  
  // Actions - Filters
  updateFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  
  // Actions - View
  setViewMode: (mode: ViewMode) => void;
  setLayout: (layout: LayoutType) => void;
  updateViewSettings: (settings: Partial<ViewSettings>) => void;
  toggleLabels: () => void;
  toggleStats: () => void;
  toggleGrid: () => void;
  
  // Actions - Statistics
  updateStats: (stats: Partial<NetworkStats>) => void;
  calculateStats: () => void;
  
  // Actions - Alerts
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  
  // Actions - Loading
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTopology: (
    id: string, 
    elements: any[], 
    viewBox: string, 
    assets?: any[],
    isEnhanced?: boolean,
    enhancedData?: any,
    networkSummary?: string
  ) => void;
  updateElementPosition: (id: string, x: number, y: number, transform?: string) => void;
  
  // Actions - Utility
  reset: () => void;
}

const defaultFilters: FilterOptions = {
  nodeTypes: ['pop', 'router', 'switch', 'server', 'firewall', 'load-balancer'],
  edgeTypes: ['fiber', 'ethernet', 'wireless', 'vpn'],
  statuses: ['online', 'offline', 'warning', 'error'],
  showOffline: true,
  showWarnings: true,
};

const defaultViewSettings: ViewSettings = {
  mode: '3d',
  layout: 'force',
  showLabels: true,
  showStats: true,
  showGrid: false,
  enablePhysics: true,
  animationSpeed: 1,
  nodeScale: 1,
  edgeOpacity: 0.8,
};

const defaultStats: NetworkStats = {
  totalNodes: 0,
  activeNodes: 0,
  totalEdges: 0,
  activeEdges: 0,
  averageLatency: 0,
  totalBandwidth: 0,
  utilizationPercentage: 0,
  healthScore: 100,
  alerts: 0,
  warnings: 0,
};

const defaultSelection: SelectionState = {
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
};

export const useTopologyStore = create<TopologyStore>((set, get) => ({
  // Initial State
  nodes: [],
  edges: [],
  selection: defaultSelection,
  filters: defaultFilters,
  searchQuery: '',
  viewMode: '3d',
  viewSettings: defaultViewSettings,
  stats: defaultStats,
  alerts: [],
  isLoading: false,
  error: null,
  uploadedSvg: null,
  currentTopologyId: null,
  topologyElements: [],
  topologyAssets: [],
  viewBox: '0 0 1000 1000',
  isEnhanced: false,
  enhancedData: null,
  networkSummary: null,
  
  // Data Management Actions
  setNodes: (nodes) => {
    set({ nodes });
    get().calculateStats();
  },
  
  setEdges: (edges) => {
    set({ edges });
    get().calculateStats();
  },

  setUploadedSvg: (svg) => {
    set({ uploadedSvg: svg });
  },
  
  addNode: (node) => {
    set((state) => ({ nodes: [...state.nodes, node] }));
    get().calculateStats();
  },
  
  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }));
    get().calculateStats();
  },
  
  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    }));
    get().calculateStats();
  },
  
  addEdge: (edge) => {
    set((state) => ({ edges: [...state.edges, edge] }));
    get().calculateStats();
  },
  
  updateEdge: (id, updates) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id ? { ...edge, ...updates } : edge
      ),
    }));
    get().calculateStats();
  },
  
  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    }));
    get().calculateStats();
  },
  
  // Selection Actions
  selectNode: (nodeId) => {
    set((state) => ({
      selection: {
        ...state.selection,
        selectedNodeId: nodeId,
        selectedEdgeId: null,
      },
    }));
  },
  
  selectEdge: (edgeId) => {
    set((state) => ({
      selection: {
        ...state.selection,
        selectedEdgeId: edgeId,
        selectedNodeId: null,
      },
    }));
  },
  
  hoverNode: (nodeId) => {
    set((state) => ({
      selection: { ...state.selection, hoveredNodeId: nodeId },
    }));
  },
  
  hoverEdge: (edgeId) => {
    set((state) => ({
      selection: { ...state.selection, hoveredEdgeId: edgeId },
    }));
  },
  
  clearSelection: () => {
    set({ selection: defaultSelection });
  },
  
  // Filter Actions
  updateFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
  
  resetFilters: () => {
    set({ filters: defaultFilters });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  // View Actions
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  setLayout: (layout) => {
    set((state) => ({
      viewSettings: { ...state.viewSettings, layout },
    }));
  },
  
  updateViewSettings: (settings) => {
    set((state) => ({
      viewSettings: { ...state.viewSettings, ...settings },
    }));
  },
  
  toggleLabels: () => {
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        showLabels: !state.viewSettings.showLabels,
      },
    }));
  },
  
  toggleStats: () => {
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        showStats: !state.viewSettings.showStats,
      },
    }));
  },
  
  toggleGrid: () => {
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        showGrid: !state.viewSettings.showGrid,
      },
    }));
  },
  
  // Statistics Actions
  updateStats: (stats) => {
    set((state) => ({
      stats: { ...state.stats, ...stats },
    }));
  },
  
  calculateStats: () => {
    const { nodes, edges, alerts } = get();
    
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter((n) => n.status === 'online').length;
    const totalEdges = edges.length;
    const activeEdges = edges.filter((e) => e.status === 'active').length;
    
    // Calculate average latency
    const edgesWithLatency = edges.filter((e) => e.data.latency !== undefined);
    const averageLatency = edgesWithLatency.length > 0
      ? edgesWithLatency.reduce((sum, e) => sum + (e.data.latency || 0), 0) / edgesWithLatency.length
      : 0;
    
    // Calculate total bandwidth
    const totalBandwidth = edges.reduce((sum, e) => {
      const bandwidth = e.data.bandwidth ? parseFloat(e.data.bandwidth) : 0;
      return sum + bandwidth;
    }, 0);
    
    // Calculate utilization percentage
    const edgesWithUtilization = edges.filter((e) => e.data.utilization !== undefined);
    const utilizationPercentage = edgesWithUtilization.length > 0
      ? edgesWithUtilization.reduce((sum, e) => sum + (e.data.utilization || 0), 0) / edgesWithUtilization.length
      : 0;
    
    // Calculate health score
    const healthScore = totalNodes > 0
      ? Math.round((activeNodes / totalNodes) * 100)
      : 100;
    
    // Count alerts and warnings
    const alertCount = alerts.filter((a) => a.severity === 'error' || a.severity === 'critical').length;
    const warningCount = alerts.filter((a) => a.severity === 'warning').length;
    
    set({
      stats: {
        totalNodes,
        activeNodes,
        totalEdges,
        activeEdges,
        averageLatency: Math.round(averageLatency * 100) / 100,
        totalBandwidth: Math.round(totalBandwidth * 100) / 100,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        healthScore,
        alerts: alertCount,
        warnings: warningCount,
      },
    });
  },
  
  // Alert Actions
  addAlert: (alert) => {
    set((state) => ({
      alerts: [...state.alerts, alert],
    }));
    get().calculateStats();
  },
  
  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    }));
    get().calculateStats();
  },
  
  acknowledgeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      ),
    }));
  },
  
  clearAlerts: () => {
    set({ alerts: [] });
    get().calculateStats();
  },
  
  // Loading Actions
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  
  setError: (error) => {
    set({ error });
  },

  setTopology: (id, elements, viewBox, assets, isEnhanced, enhancedData, networkSummary) => {
    set({ 
      currentTopologyId: id, 
      topologyElements: elements, 
      viewBox, 
      topologyAssets: assets || [],
      isEnhanced: isEnhanced || false,
      enhancedData: enhancedData || null,
      networkSummary: networkSummary || null,
    });
  },

  updateElementPosition: (id, x, y, transform) => {
    set((state) => ({
      topologyElements: state.topologyElements.map((el) =>
        el.id === id ? { ...el, x, y, transform: transform ?? el.transform } : el
      ),
    }));
  },
  
  // Utility Actions
  reset: () => {
    set({
      nodes: [],
      edges: [],
      selection: defaultSelection,
      filters: defaultFilters,
      searchQuery: '',
      viewMode: '3d',
      viewSettings: defaultViewSettings,
      stats: defaultStats,
      alerts: [],
      isLoading: false,
      error: null,
    });
  },
}));

// Made with Bob
