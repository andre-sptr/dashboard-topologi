import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import Node3D from './Node3D.tsx';
import Edge3D from './Edge3D.tsx';
// Node and Edge types removed as they were unused

interface Scene3DProps {
  className?: string;
}

const Scene3D = ({ className = '' }: Scene3DProps) => {
  const nodes = useTopologyStore((state) => state.nodes);
  const edges = useTopologyStore((state) => state.edges);
  const viewSettings = useTopologyStore((state) => state.viewSettings);
  const filters = useTopologyStore((state) => state.filters);
  const searchQuery = useTopologyStore((state) => state.searchQuery);

  // Filter nodes based on current filters
  const filteredNodes = nodes.filter((node) => {
    // Filter by node type
    if (!filters.nodeTypes.includes(node.type)) return false;
    
    // Filter by status
    if (!filters.statuses.includes(node.status)) return false;
    
    // Filter by search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesLabel = node.label.toLowerCase().includes(query);
      const matchesIp = node.data.ip?.toLowerCase().includes(query);
      const matchesLocation = node.data.location?.toLowerCase().includes(query);
      
      if (!matchesLabel && !matchesIp && !matchesLocation) return false;
    }
    
    return true;
  });

  // Filter edges based on filtered nodes
  const filteredEdges = edges.filter((edge) => {
    const sourceExists = filteredNodes.some((n) => n.id === edge.source);
    const targetExists = filteredNodes.some((n) => n.id === edge.target);
    return sourceExists && targetExists && filters.edgeTypes.includes(edge.type);
  });

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 500, 1000]} fov={60} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.3} color="#60a5fa" />
          <pointLight position={[10, -10, -5]} intensity={0.3} color="#a78bfa" />
          
          {/* Environment */}
          <Environment preset="city" />
          
          {/* Fog for depth */}
          <fog attach="fog" args={['#0f172a', 500, 3000]} />
          
          {/* Grid */}
          {viewSettings.showGrid && (
            <Grid
              args={[2000, 2000]}
              cellSize={100}
              cellThickness={0.5}
              cellColor="#334155"
              sectionSize={500}
              sectionThickness={1}
              sectionColor="#475569"
              fadeDistance={2000}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid
            />
          )}
          
          {/* Render Edges */}
          {filteredEdges.map((edge) => {
            const sourceNode = filteredNodes.find((n) => n.id === edge.source);
            const targetNode = filteredNodes.find((n) => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;
            
            return (
              <Edge3D
                key={edge.id}
                edge={edge}
                sourcePosition={sourceNode.position}
                targetPosition={targetNode.position}
              />
            );
          })}
          
          {/* Render Nodes */}
          {filteredNodes.map((node) => (
            <Node3D key={node.id} node={node} />
          ))}
          
          {/* Controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            panSpeed={0.5}
            minDistance={100}
            maxDistance={2000}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Scene3D;

// Made with Bob
