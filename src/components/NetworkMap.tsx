import { useMemo, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  type NodeMouseHandler,
  type EdgeMouseHandler
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MainPopNode, RouterNode, SwitchNode } from './TopologyNodes';
import PremiumEdge from './PremiumEdge';
import topologyData from '../data/topology.json';

const nodeTypes = {
  MAIN_POP: MainPopNode,
  ROUTER: RouterNode,
  SWITCH: SwitchNode,
};

const edgeTypes = {
  premium: PremiumEdge,
};

interface NetworkMapProps {
  onSelectionChange: (item: any) => void;
}

const NetworkMap = ({ onSelectionChange }: NetworkMapProps) => {
  const initialNodes = useMemo(() => 
    topologyData.backbone.nodes.map(node => ({
      id: node.id,
      type: node.type,
      data: { ...node },
      position: { x: node.x, y: node.y },
    })), 
  []);

  const initialEdges = useMemo(() => 
    topologyData.backbone.links.map(link => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: 'premium',
      label: `${link.label} (${link.bw})`,
      data: { ...link },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
      },
    })), 
  []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    onSelectionChange(node);
  }, [onSelectionChange]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    onSelectionChange(edge);
  }, [onSelectionChange]);

  const onPaneClick = useCallback(() => {
    onSelectionChange(null);
  }, [onSelectionChange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background color="#1e293b" gap={20} style={{ opacity: 0.4 }} />
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'MAIN_POP') return '#3b82f6';
            if (n.type === 'ROUTER') return '#6366f1';
            return '#10b981';
          }}
          maskColor="rgba(15, 23, 42, 0.6)"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}
        />
      </ReactFlow>
    </div>
  );
};

export default NetworkMap;
