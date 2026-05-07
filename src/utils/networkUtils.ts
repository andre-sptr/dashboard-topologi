import type { Node, Edge, NodeType, SearchResult } from '../types/topology';

/**
 * Calculate 3D positions for nodes using force-directed layout
 */
export const calculateForceDirectedPositions = (
  nodes: Node[],
  edges: Edge[],
  options: {
    width?: number;
    height?: number;
    depth?: number;
    iterations?: number;
    repulsion?: number;
    attraction?: number;
  } = {}
): Node[] => {
  const {
    width = 1000,
    height = 1000,
    depth = 1000,
    iterations = 100,
    repulsion = 1000,
    attraction = 0.01,
  } = options;

  // Initialize random positions if not set
  const positionedNodes = nodes.map((node) => ({
    ...node,
    position: node.position || {
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * depth - depth / 2,
    },
  }));

  // Build adjacency map
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  // Force-directed algorithm
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number; z: number }>();

    // Initialize forces
    positionedNodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0, z: 0 });
    });

    // Calculate repulsion forces
    for (let i = 0; i < positionedNodes.length; i++) {
      for (let j = i + 1; j < positionedNodes.length; j++) {
        const node1 = positionedNodes[i];
        const node2 = positionedNodes[j];

        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const dz = node2.position.z - node1.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        const force = repulsion / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;

        const force1 = forces.get(node1.id)!;
        const force2 = forces.get(node2.id)!;

        force1.x -= fx;
        force1.y -= fy;
        force1.z -= fz;
        force2.x += fx;
        force2.y += fy;
        force2.z += fz;
      }
    }

    // Calculate attraction forces
    edges.forEach((edge) => {
      const source = positionedNodes.find((n) => n.id === edge.source);
      const target = positionedNodes.find((n) => n.id === edge.target);

      if (source && target) {
        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        const dz = target.position.z - source.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        const force = distance * attraction;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;

        const forceSource = forces.get(source.id)!;
        const forceTarget = forces.get(target.id)!;

        forceSource.x += fx;
        forceSource.y += fy;
        forceSource.z += fz;
        forceTarget.x -= fx;
        forceTarget.y -= fy;
        forceTarget.z -= fz;
      }
    });

    // Apply forces
    const damping = 0.9;
    positionedNodes.forEach((node) => {
      const force = forces.get(node.id)!;
      node.position.x += force.x * damping;
      node.position.y += force.y * damping;
      node.position.z += force.z * damping;
    });
  }

  return positionedNodes;
};

/**
 * Calculate hierarchical layout positions
 */
export const calculateHierarchicalPositions = (
  nodes: Node[],
  edges: Edge[],
  options: {
    levelHeight?: number;
    nodeSpacing?: number;
  } = {}
): Node[] => {
  const { levelHeight = 200, nodeSpacing = 150 } = options;

  // Find root nodes (nodes with no incoming edges)
  const incomingEdges = new Map<string, number>();
  nodes.forEach((node) => incomingEdges.set(node.id, 0));
  edges.forEach((edge) => {
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1);
  });

  const rootNodes = nodes.filter((node) => incomingEdges.get(node.id) === 0);

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)?.push(edge.target);
  });

  // Assign levels using BFS
  const levels = new Map<string, number>();
  const queue = rootNodes.map((node) => ({ id: node.id, level: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    const children = adjacency.get(id) || [];
    children.forEach((childId) => {
      queue.push({ id: childId, level: level + 1 });
    });
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)?.push(node);
  });

  // Position nodes
  const positionedNodes = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node);
    const totalInLevel = nodesInLevel.length;

    return {
      ...node,
      position: {
        x: (indexInLevel - totalInLevel / 2) * nodeSpacing,
        y: -level * levelHeight,
        z: 0,
      },
    };
  });

  return positionedNodes;
};

/**
 * Calculate circular layout positions
 */
export const calculateCircularPositions = (
  nodes: Node[],
  options: {
    radius?: number;
  } = {}
): Node[] => {
  const { radius = 500 } = options;
  const angleStep = (2 * Math.PI) / nodes.length;

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: Math.cos(index * angleStep) * radius,
      y: Math.sin(index * angleStep) * radius,
      z: 0,
    },
  }));
};

/**
 * Calculate grid layout positions
 */
export const calculateGridPositions = (
  nodes: Node[],
  options: {
    spacing?: number;
    columns?: number;
  } = {}
): Node[] => {
  const { spacing = 200, columns = Math.ceil(Math.sqrt(nodes.length)) } = options;

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: col * spacing - (columns * spacing) / 2,
        y: -row * spacing,
        z: 0,
      },
    };
  });
};

/**
 * Generate color based on node type
 */
export const getNodeColor = (type: NodeType): string => {
  const colors: Record<NodeType, string> = {
    pop: '#2563eb',
    router: '#64748b',
    switch: '#059669',
    server: '#d97706',
    firewall: '#dc2626',
    'load-balancer': '#7c3aed',
  };
  return colors[type] || '#64748b';
};

/**
 * Generate color based on status
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    online: '#059669',
    offline: '#64748b',
    warning: '#d97706',
    error: '#dc2626',
    active: '#059669',
    inactive: '#64748b',
    degraded: '#d97706',
  };
  return colors[status] || '#64748b';
};

/**
 * Filter nodes based on criteria
 */
export const filterNodes = (
  nodes: Node[],
  filters: {
    types?: NodeType[];
    statuses?: string[];
    searchQuery?: string;
  }
): Node[] => {
  return nodes.filter((node) => {
    // Filter by type
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(node.type)) return false;
    }

    // Filter by status
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(node.status)) return false;
    }

    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase();
      const matchesLabel = node.label.toLowerCase().includes(query);
      const matchesIp = node.data.ip?.toLowerCase().includes(query);
      const matchesLocation = node.data.location?.toLowerCase().includes(query);
      const matchesDescription = node.data.description?.toLowerCase().includes(query);

      if (!matchesLabel && !matchesIp && !matchesLocation && !matchesDescription) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Search nodes with scoring
 */
export const searchNodes = (nodes: Node[], query: string): SearchResult[] => {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  nodes.forEach((node) => {
    let score = 0;
    const matchedFields: string[] = [];

    // Check label (highest priority)
    if (node.label.toLowerCase().includes(lowerQuery)) {
      score += 10;
      matchedFields.push('label');
    }

    // Check IP
    if (node.data.ip?.toLowerCase().includes(lowerQuery)) {
      score += 8;
      matchedFields.push('ip');
    }

    // Check location
    if (node.data.location?.toLowerCase().includes(lowerQuery)) {
      score += 6;
      matchedFields.push('location');
    }

    // Check description
    if (node.data.description?.toLowerCase().includes(lowerQuery)) {
      score += 4;
      matchedFields.push('description');
    }

    // Check type
    if (node.type.toLowerCase().includes(lowerQuery)) {
      score += 3;
      matchedFields.push('type');
    }

    if (score > 0) {
      results.push({ node, score, matchedFields });
    }
  });

  // Sort by score (descending)
  return results.sort((a, b) => b.score - a.score);
};

/**
 * Calculate distance between two nodes
 */
export const calculateDistance = (node1: Node, node2: Node): number => {
  const dx = node2.position.x - node1.position.x;
  const dy = node2.position.y - node1.position.y;
  const dz = node2.position.z - node1.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Find shortest path between two nodes using Dijkstra's algorithm
 */
export const findShortestPath = (
  nodes: Node[],
  edges: Edge[],
  startId: string,
  endId: string
): string[] | null => {
  // Build adjacency map with weights
  const adjacency = new Map<string, Map<string, number>>();
  nodes.forEach((node) => adjacency.set(node.id, new Map()));

  edges.forEach((edge) => {
    const weight = edge.data.latency || 1;
    adjacency.get(edge.source)?.set(edge.target, weight);
    adjacency.get(edge.target)?.set(edge.source, weight);
  });

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>(nodes.map((n) => n.id));

  nodes.forEach((node) => {
    distances.set(node.id, node.id === startId ? 0 : Infinity);
    previous.set(node.id, null);
  });

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current: string | null = null;
    let minDistance = Infinity;
    unvisited.forEach((nodeId) => {
      const distance = distances.get(nodeId) || Infinity;
      if (distance < minDistance) {
        minDistance = distance;
        current = nodeId;
      }
    });

    if (current === null || minDistance === Infinity) break;
    if (current === endId) break;

    unvisited.delete(current);

    // Update distances to neighbors
    const neighbors = adjacency.get(current) || new Map();
    neighbors.forEach((weight, neighborId) => {
      if (unvisited.has(neighborId)) {
        const alt = (distances.get(current!) || 0) + weight;
        if (alt < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, alt);
          previous.set(neighborId, current);
        }
      }
    });
  }

  // Reconstruct path
  if (!previous.has(endId) || previous.get(endId) === null) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return path.length > 1 ? path : null;
};

/**
 * Format bandwidth for display
 */
export const formatBandwidth = (bandwidth: number | string): string => {
  const value = typeof bandwidth === 'string' ? parseFloat(bandwidth) : bandwidth;
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} Gbps`;
  }
  return `${value.toFixed(0)} Mbps`;
};

/**
 * Format latency for display
 */
export const formatLatency = (latency: number): string => {
  if (latency < 1) {
    return `${(latency * 1000).toFixed(0)} μs`;
  }
  return `${latency.toFixed(1)} ms`;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Made with Bob
