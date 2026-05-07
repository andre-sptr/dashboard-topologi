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
    topologyData.nodes.map((node: any) => ({
      id: node.id,
      type: node.type,
      data: { ...node },
      position: { x: node.position.x, y: node.position.y },
    })), 
  []);

  const initialEdges = useMemo(() => 
    topologyData.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'premium',
      label: `${edge.id}`, // or edge.data.bandwidth etc.
      data: { ...edge },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
      },
    })), 
  []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick: NodeMouseHandler = useCallback((_: React.MouseEvent, node: any) => {
    onSelectionChange(node);
  }, [onSelectionChange]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_: React.MouseEvent, edge: any) => {
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
          nodeColor={(n: any) => {
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
