import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Zap } from 'lucide-react';
import { useTopologyStore } from '../store/topologyStore';

interface ComparisonPanelProps {
  onClose: () => void;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ onClose }) => {
  const isEnhanced = useTopologyStore((state) => state.isEnhanced);
  const networkSummary = useTopologyStore((state) => state.networkSummary);
  const topologyElements = useTopologyStore((state) => state.topologyElements);
  const enhancedData = useTopologyStore((state) => state.enhancedData);

  if (!isEnhanced) return null;

  const originalNodeCount = topologyElements.filter(el => {
    try {
      const props = JSON.parse(el.props);
      return props['data-node-type'] === 'network-node';
    } catch { return false; }
  }).length;

  const enhancedNodeCount = enhancedData.nodes.length;
  const enhancedEdgeCount = enhancedData.edges.length;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed top-0 right-0 w-96 h-full bg-slate-900/90 backdrop-blur-2xl border-l border-slate-800 z-50 shadow-2xl flex flex-col"
    >
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          AI Enhancement
        </h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Summary Section */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Summary</h3>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-slate-300 leading-relaxed">
            {networkSummary}
          </div>
        </section>

        {/* Stats Comparison */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Analysis Results</h3>
          
          <div className="space-y-3">
            <ComparisonRow 
              label="Node Detection" 
              original={`${originalNodeCount} raw shapes`} 
              enhanced={`${enhancedNodeCount} typed nodes`} 
            />
            <ComparisonRow 
              label="Connectivity" 
              original="Visual paths" 
              enhanced={`${enhancedEdgeCount} logical links`} 
            />
            <ComparisonRow 
              label="Metadata" 
              original="None" 
              enhanced="AI enriched" 
              check
            />
            <ComparisonRow 
              label="Visual Style" 
              original="Static SVG" 
              enhanced="Premium animated" 
              check
            />
          </div>
        </section>

        {/* AI Findings */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Insights</h3>
          <div className="space-y-2">
            {enhancedData.nodes.slice(0, 3).map((node: any) => (
              <div key={node.id} className="flex gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                <div>
                  <p className="text-xs font-bold text-white">{node.id}</p>
                  <p className="text-[10px] text-slate-400">{node.data.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50">
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          View Enhanced Topology
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

const ComparisonRow = ({ label, original, enhanced, check = false }: any) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 text-xs text-slate-500 truncate">{original}</div>
      <ArrowRight className="w-3 h-3 text-slate-700" />
      <div className="flex-1 text-xs text-blue-400 font-semibold flex items-center gap-1.5 justify-end">
        {enhanced}
        {check && <Check className="w-3 h-3 text-emerald-500" />}
      </div>
    </div>
  </div>
);

export default ComparisonPanel;
