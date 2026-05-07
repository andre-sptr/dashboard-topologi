import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text, Sphere, Box, Cylinder, Cone } from '@react-three/drei';
import { useTopologyStore } from '../../store/topologyStore';
import { getNodeColor, getStatusColor } from '../../utils/networkUtils';
import type { Node } from '../../types/topology';
import * as THREE from 'three';

interface Node3DProps {
  node: Node;
}

const Node3D = ({ node }: Node3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const selection = useTopologyStore((state) => state.selection);
  const viewSettings = useTopologyStore((state) => state.viewSettings);
  const selectNode = useTopologyStore((state) => state.selectNode);
  const hoverNode = useTopologyStore((state) => state.hoverNode);
  
  const isSelected = selection.selectedNodeId === node.id;
  const isHovered = selection.hoveredNodeId === node.id || hovered;
  
  // Get colors
  const baseColor = node.color || getNodeColor(node.type);
  const statusColor = getStatusColor(node.status);
  
  // Calculate size with scale
  const baseSize = (node.size || 1) * viewSettings.nodeScale;
  const size = isHovered ? baseSize * 1.2 : baseSize;
  
  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = node.position.y + Math.sin(state.clock.elapsedTime + node.position.x) * 2;
      
      // Rotation for selected nodes
      if (isSelected) {
        meshRef.current.rotation.y += 0.01;
      }
    }
    
    // Glow pulse for selected nodes
    if (glowRef.current && isSelected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });
  
  // Handle interactions
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(node.id);
  };
  
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    hoverNode(node.id);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    hoverNode(null);
    document.body.style.cursor = 'default';
  };
  
  // Render different geometries based on node type
  const renderGeometry = () => {
    const scale = size * 10;
    
    switch (node.type) {
      case 'router':
        return (
          <>
            <Cylinder args={[scale, scale * 0.8, scale * 1.5, 32]}>
              <meshStandardMaterial
                color={baseColor}
                metalness={0.6}
                roughness={0.3}
                emissive={isSelected ? baseColor : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
              />
            </Cylinder>
            <Cone args={[scale * 0.8, scale * 0.5, 32]} position={[0, scale * 1, 0]}>
              <meshStandardMaterial
                color={baseColor}
                metalness={0.6}
                roughness={0.3}
              />
            </Cone>
          </>
        );
      
      case 'switch':
        return (
          <Box args={[scale * 1.5, scale * 0.8, scale * 1.2]}>
            <meshStandardMaterial
              color={baseColor}
              metalness={0.5}
              roughness={0.4}
              emissive={isSelected ? baseColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </Box>
        );
      
      case 'server':
        return (
          <Box args={[scale * 0.8, scale * 2, scale * 0.8]}>
            <meshStandardMaterial
              color={baseColor}
              metalness={0.7}
              roughness={0.2}
              emissive={isSelected ? baseColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </Box>
        );
      
      case 'firewall':
        return (
          <Box args={[scale * 1.2, scale * 1.2, scale * 0.6]}>
            <meshStandardMaterial
              color={baseColor}
              metalness={0.8}
              roughness={0.2}
              emissive={isSelected ? baseColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </Box>
        );
      
      case 'load-balancer':
        return (
          <Cylinder args={[scale * 0.6, scale * 1.2, scale * 1.2, 6]}>
            <meshStandardMaterial
              color={baseColor}
              metalness={0.6}
              roughness={0.3}
              emissive={isSelected ? baseColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </Cylinder>
        );
      
      case 'pop':
      default:
        return (
          <Sphere args={[scale, 32, 32]}>
            <meshStandardMaterial
              color={baseColor}
              metalness={0.5}
              roughness={0.4}
              emissive={isSelected ? baseColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </Sphere>
        );
    }
  };
  
  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      {/* Glow effect for selected nodes */}
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 15, 32, 32]} />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Main node geometry */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        {renderGeometry()}
      </mesh>
      
      {/* Status indicator */}
      <mesh position={[0, size * 15, 0]}>
        <sphereGeometry args={[size * 3, 16, 16]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>
      
      {/* Label */}
      {viewSettings.showLabels && (
        <Text
          position={[0, -size * 20, 0]}
          fontSize={size * 8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={size * 0.5}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      )}
      
      {/* Additional info on hover */}
      {isHovered && node.data.ip && (
        <Text
          position={[0, -size * 30, 0]}
          fontSize={size * 6}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={size * 0.3}
          outlineColor="#000000"
        >
          {node.data.ip}
        </Text>
      )}
    </group>
  );
};

export default Node3D;

// Made with Bob
