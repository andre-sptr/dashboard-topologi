import { useTopologyStore } from '../../store/topologyStore';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Sun, 
  Moon,
  Box,
  Grid3x3,
  Circle,
  Network
} from 'lucide-react';
import type { ViewMode, LayoutType } from '../../types/topology';
import { useState } from 'react';

const ControlPanel = () => {
  const viewMode = useTopologyStore((state) => state.viewMode);
  const viewSettings = useTopologyStore((state) => state.viewSettings);
  const setViewMode = useTopologyStore((state) => state.setViewMode);
  const setLayout = useTopologyStore((state) => state.setLayout);
  const updateViewSettings = useTopologyStore((state) => state.updateViewSettings);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };
  
  const handleLayoutChange = (layout: LayoutType) => {
    setLayout(layout);
  };
  
  const handleZoomIn = () => {
    updateViewSettings({ nodeScale: Math.min(viewSettings.nodeScale + 0.1, 3) });
  };
  
  const handleZoomOut = () => {
    updateViewSettings({ nodeScale: Math.max(viewSettings.nodeScale - 0.1, 0.5) });
  };
  
  const handleReset = () => {
    updateViewSettings({
      nodeScale: 1,
      edgeOpacity: 0.8,
      animationSpeed: 1,
    });
  };
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Theme toggle logic would go here
  };
  
  const viewModes: { value: ViewMode; label: string }[] = [
    { value: '3d', label: '3D' },
    { value: '2d', label: '2D' },
    { value: 'hybrid', label: 'Hybrid' },
  ];
  
  const layouts: { value: LayoutType; icon: any; label: string }[] = [
    { value: 'force', icon: Network, label: 'Force' },
    { value: 'hierarchical', icon: Box, label: 'Hierarchical' },
    { value: 'circular', icon: Circle, label: 'Circular' },
    { value: 'grid', icon: Grid3x3, label: 'Grid' },
  ];
  
  return (
    <div className="fixed top-4 right-4 z-10 flex flex-col gap-3">
      {/* View Mode Selector */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-2xl">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-1">View Mode</div>
        <div className="flex gap-1">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleViewModeChange(mode.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode.value
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Layout Selector */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-2xl">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-1">Layout</div>
        <div className="grid grid-cols-2 gap-1">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            return (
              <button
                key={layout.value}
                onClick={() => handleLayoutChange(layout.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  viewSettings.layout === layout.value
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{layout.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Zoom Controls */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-2xl">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-1">Zoom</div>
        <div className="flex gap-1">
          <button
            onClick={handleZoomOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all"
            title="Zoom Out"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Out</span>
          </button>
          <button
            onClick={handleZoomIn}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all"
            title="Zoom In"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>In</span>
          </button>
        </div>
        <div className="mt-2 text-center text-xs text-slate-500">
          Scale: {(viewSettings.nodeScale * 100).toFixed(0)}%
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-2xl">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all"
            title="Toggle Theme"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

// Made with Bob
