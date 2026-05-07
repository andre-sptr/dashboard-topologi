import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Server, Activity, Box } from 'lucide-react';

export const MainPopNode = memo(({ data }: any) => {
  return (
    <div className="glass-card custom-node pop-node">
      <div className="node-icon-container pop-bg">
        <Server size={24} className="text-white" />
      </div>
      <div className="node-content">
        <div className="node-header">
          <span className="node-type-label">MAIN POP</span>
          <div className="status-dot online" />
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle" />
      <Handle type="target" position={Position.Top} className="custom-handle" />
      <Handle type="source" position={Position.Right} className="custom-handle" />
      <Handle type="target" position={Position.Left} className="custom-handle" />
    </div>
  );
});

export const RouterNode = memo(({ data }: any) => {
  return (
    <div className="glass-card custom-node router-node">
      <div className="node-icon-container router-bg">
        <Activity size={18} className="text-white" />
      </div>
      <div className="node-content">
        <div className="node-header">
          <span className="node-type-label">CORE ROUTER</span>
          <div className="status-dot online" />
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle" />
      <Handle type="target" position={Position.Top} className="custom-handle" />
      <Handle type="source" position={Position.Right} className="custom-handle" />
      <Handle type="target" position={Position.Left} className="custom-handle" />
    </div>
  );
});

export const SwitchNode = memo(({ data }: any) => {
  return (
    <div className="glass-card custom-node switch-node">
      <div className="node-icon-container switch-bg">
        <Box size={16} className="text-white" />
      </div>
      <div className="node-content">
        <div className="node-header">
          <span className="node-type-label">METRO-E</span>
          <div className="status-dot online" />
        </div>
        <div className="node-title">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="custom-handle" />
      <Handle type="target" position={Position.Top} className="custom-handle" />
      <Handle type="source" position={Position.Right} className="custom-handle" />
      <Handle type="target" position={Position.Left} className="custom-handle" />
    </div>
  );
});
