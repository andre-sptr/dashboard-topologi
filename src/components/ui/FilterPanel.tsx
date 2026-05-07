import { useTopologyStore } from '../../store/topologyStore';
import { Search, X, Filter } from 'lucide-react';
import type { NodeType, EdgeType, NodeStatus } from '../../types/topology';
import { useState } from 'react';

const FilterPanel = () => {
  const filters = useTopologyStore((state) => state.filters);
  const searchQuery = useTopologyStore((state) => state.searchQuery);
  const updateFilters = useTopologyStore((state) => state.updateFilters);
  const resetFilters = useTopologyStore((state) => state.resetFilters);
  const setSearchQuery = useTopologyStore((state) => state.setSearchQuery);
  
  const [isExpanded, setIsExpanded] = useState(true);
  
  const nodeTypes: { value: NodeType; label: string; color: string }[] = [
    { value: 'pop', label: 'POP', color: 'bg-blue-500' },
    { value: 'router', label: 'Router', color: 'bg-slate-500' },
    { value: 'switch', label: 'Switch', color: 'bg-green-500' },
    { value: 'server', label: 'Server', color: 'bg-amber-500' },
    { value: 'firewall', label: 'Firewall', color: 'bg-red-500' },
    { value: 'load-balancer', label: 'Load Balancer', color: 'bg-purple-500' },
  ];
  
  const edgeTypes: { value: EdgeType; label: string; color: string }[] = [
    { value: 'fiber', label: 'Fiber', color: 'bg-blue-500' },
    { value: 'ethernet', label: 'Ethernet', color: 'bg-green-500' },
    { value: 'wireless', label: 'Wireless', color: 'bg-amber-500' },
    { value: 'vpn', label: 'VPN', color: 'bg-purple-500' },
  ];
  
  const statuses: { value: NodeStatus; label: string; color: string }[] = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'offline', label: 'Offline', color: 'bg-slate-500' },
    { value: 'warning', label: 'Warning', color: 'bg-amber-500' },
    { value: 'error', label: 'Error', color: 'bg-red-500' },
  ];
  
  const toggleNodeType = (type: NodeType) => {
    const newTypes = filters.nodeTypes.includes(type)
      ? filters.nodeTypes.filter((t) => t !== type)
      : [...filters.nodeTypes, type];
    updateFilters({ nodeTypes: newTypes });
  };
  
  const toggleEdgeType = (type: EdgeType) => {
    const newTypes = filters.edgeTypes.includes(type)
      ? filters.edgeTypes.filter((t) => t !== type)
      : [...filters.edgeTypes, type];
    updateFilters({ edgeTypes: newTypes });
  };
  
  const toggleStatus = (status: NodeStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: newStatuses });
  };
  
  const handleClearFilters = () => {
    resetFilters();
    setSearchQuery('');
  };
  
  return (
    <div className="fixed top-4 left-4 z-10 w-80">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Filters</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <Filter className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {isExpanded && (
          <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Search */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>
            
            {/* Node Types */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Node Types
              </label>
              <div className="space-y-1.5">
                {nodeTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.nodeTypes.includes(type.value)}
                      onChange={() => toggleNodeType(type.value)}
                      className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 bg-slate-800"
                    />
                    <div className={`w-2 h-2 rounded-full ${type.color}`} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Connection Types */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Connection Types
              </label>
              <div className="space-y-1.5">
                {edgeTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.edgeTypes.includes(type.value)}
                      onChange={() => toggleEdgeType(type.value)}
                      className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 bg-slate-800"
                    />
                    <div className={`w-2 h-2 rounded-full ${type.color}`} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Status Filters */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Status
              </label>
              <div className="space-y-1.5">
                {statuses.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 bg-slate-800"
                    />
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Clear Filters Button */}
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;

// Made with Bob
