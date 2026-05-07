import { getBezierPath, type EdgeProps, EdgeLabelRenderer } from 'reactflow';

export default function PremiumEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 4,
          stroke: 'rgba(59, 130, 246, 0.1)',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <path
        id={`${id}-animated`}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: 'var(--color-primary)',
          strokeDasharray: '10, 20',
        }}
        className="react-flow__edge-path animate-traffic"
        d={edgePath}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(0, 0, 0, 0.9)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 800,
              color: '#ffffff',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
