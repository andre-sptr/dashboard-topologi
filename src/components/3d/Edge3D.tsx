import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Tube } from '@react-three/drei';
import { useTopologyStore } from '../../store/topologyStore';
import type { Edge } from '../../types/topology';
import * as THREE from 'three';

interface Edge3DProps {
  edge: Edge;
  sourcePosition: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
}

const Edge3D = ({ edge, sourcePosition, targetPosition }: Edge3DProps) => {
  const tubeRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);
  
  const selection = useTopologyStore((state) => state.selection);
  const viewSettings = useTopologyStore((state) => state.viewSettings);
  
  const isSelected = selection.selectedEdgeId === edge.id;
  const isHovered = selection.hoveredEdgeId === edge.id;
  
  // Get edge color based on type
  const getEdgeColor = () => {
    if (edge.color) return edge.color;
    
    switch (edge.type) {
      case 'fiber':
        return '#3b82f6'; // Blue
      case 'ethernet':
        return '#10b981'; // Green
      case 'wireless':
        return '#f59e0b'; // Amber
      case 'vpn':
        return '#8b5cf6'; // Purple
      default:
        return '#64748b'; // Slate
    }
  };
  
  // Get edge status color
  const getStatusColor = () => {
    switch (edge.status) {
      case 'active':
        return '#10b981'; // Green
      case 'inactive':
        return '#64748b'; // Slate
      case 'degraded':
        return '#f59e0b'; // Amber
      case 'error':
        return '#ef4444'; // Red
      default:
        return '#64748b';
    }
  };
  
  const baseColor = getEdgeColor();
  const statusColor = getStatusColor();
  const color = edge.status === 'active' ? baseColor : statusColor;
  
  // Calculate width based on bandwidth utilization
  const baseWidth = edge.width || 1;
  const utilization = edge.data.utilization || 50;
  const width = baseWidth * (0.5 + (utilization / 100) * 0.5) * viewSettings.nodeScale;
  
  // Create curve for the edge
  const curve = useMemo(() => {
    const start = new THREE.Vector3(sourcePosition.x, sourcePosition.y, sourcePosition.z);
    const end = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
    
    // Add a slight curve for visual appeal
    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
    midPoint.y += distance * 0.1; // Curve upward
    
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [sourcePosition, targetPosition]);
  
  // Create points for line
  const points = useMemo(() => {
    return curve.getPoints(50);
  }, [curve]);
  
  // Animation for active connections
  useFrame((state) => {
    if (edge.animated && edge.status === 'active') {
      if (tubeRef.current) {
        // Animate texture offset for flow effect
        const material = tubeRef.current.material as THREE.MeshStandardMaterial;
        if (material.map) {
          material.map.offset.x = (state.clock.elapsedTime * 0.5) % 1;
        }
      }
      
      if (lineRef.current) {
        // Pulse effect for lines
        const material = lineRef.current.material as THREE.LineBasicMaterial;
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      }
    }
    
    // Glow effect for selected edges
    if (isSelected && tubeRef.current) {
      const material = tubeRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });
  
  // Render based on connection type
  const isDashed = edge.connectionType === 'backup';
  
  if (isDashed) {
    // Render dashed line for backup connections
    return (
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={width * 2}
        dashed
        dashScale={20}
        dashSize={10}
        gapSize={5}
        transparent
        opacity={viewSettings.edgeOpacity * (isSelected || isHovered ? 1 : 0.6)}
      />
    );
  }
  
  // Render tube for primary connections
  return (
    <group>
      {/* Main tube */}
      <Tube
        ref={tubeRef}
        args={[curve, 50, width, 8, false]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={viewSettings.edgeOpacity * (isSelected || isHovered ? 1 : 0.8)}
          metalness={0.3}
          roughness={0.7}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </Tube>
      
      {/* Glow effect for selected edges */}
      {isSelected && (
        <Tube args={[curve, 50, width * 2, 8, false]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Tube>
      )}
      
      {/* Flow particles for active connections */}
      {edge.animated && edge.status === 'active' && (
        <mesh>
          <sphereGeometry args={[width * 2, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
};

export default Edge3D;

// Made with Bob
