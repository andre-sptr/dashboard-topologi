import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Settings2, Activity, Database, BarChart3, ChevronRight } from 'lucide-react';
import { useTopologyStore } from './store/topologyStore';
import SVGFileUpload from './components/ui/SVGFileUpload';
import TopologyViewer2D from './components/TopologyViewer2D';
import ComparisonPanel from './components/ComparisonPanel';
import { useState } from 'react';
import StoragePage from './components/StoragePage.tsx';

function App() {
  const uploadedSvg = useTopologyStore((state) => state.uploadedSvg);
  const setTopology = useTopologyStore((state) => state.setTopology);
  const setUploadedSvg = useTopologyStore((state) => state.setUploadedSvg);
  const isEnhanced = useTopologyStore((state) => state.isEnhanced);

  const [view, setView] = useState<'dashboard' | 'storage'>('dashboard');
  const [showComparison, setShowComparison] = useState(false);

  // Load latest topology on mount
  useEffect(() => {
    const loadLatest = async () => {
      try {
        const res = await fetch('http://localhost:3002/api/topologies');
        const topologies = await res.json();
        if (topologies.length > 0) {
          const latest = topologies[0];
          const fullRes = await fetch(`http://localhost:3002/api/topologies/${latest.id}`);
          const data = await fullRes.json();

          setTopology(
            data.id,
            data.elements,
            data.viewBox,
            data.assets ? JSON.parse(data.assets) : [],
            data.isEnhanced,
            data.enhancedData ? JSON.parse(data.enhancedData) : null,
            data.networkSummary
          );
          // Set uploadedSvg to something truthy to show the viewer
          setUploadedSvg('<svg></svg>');
        }
      } catch (error) {
        console.error('Failed to load latest topology:', error);
      }
    };
    loadLatest();
  }, [setTopology, setUploadedSvg]);

  return (
    <div className="relative w-full h-screen bg-slate-950 flex overflow-hidden selection:bg-blue-500/30">
      {/* Sidebar - Menu Navigasi */}
      <motion.aside
        initial={{ x: -80 }}
        animate={{ x: 0 }}
        className="w-20 h-full glass-panel border-r border-slate-800/50 flex flex-col items-center py-8 gap-8 z-30"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
          <Network className="w-6 h-6" />
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <NavItem icon={<BarChart3 className="w-5 h-5" />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<Database className="w-5 h-5" />} active={view === 'storage'} onClick={() => setView('storage')} />
          <NavItem icon={<Activity className="w-5 h-5" />} active={false} />
          <NavItem icon={<Settings2 className="w-5 h-5" />} active={false} />
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-slate-900/50">
          <div>
            <motion.h1 
              key={view}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-black text-gradient uppercase tracking-tighter"
            >
              Topology <span className="text-blue-500">{view === 'dashboard' ? 'Dashboard' : 'Storage'}</span>
            </motion.h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">System Operational - 2D Rendering Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Region</p>
                <p className="text-xs text-white font-semibold">Sumbagteng</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-none h-[calc(100vh-6rem)] min-h-[600px] p-8">
          <AnimatePresence mode="wait">
            {view === 'storage' ? (
              <StoragePage key="storage-page" />
            ) : !uploadedSvg ? (
              <motion.div
                key="upload-view"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <div className="mb-12 text-center max-w-md">
                  <h2 className="text-4xl font-bold text-white mb-4">Mulai Visualisasi</h2>
                  <p className="text-slate-400">
                    Upload file topologi Anda dalam format SVG untuk mendapatkan tampilan interaktif dengan kualitas tinggi.
                  </p>
                </div>
                <SVGFileUpload onUploadComplete={() => isEnhanced && setShowComparison(true)} />
              </motion.div>
            ) : (
              <motion.div
                key="viewer-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full"
              >
                <TopologyViewer2D />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* New Scrollable Insights Sections */}
        {uploadedSvg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="px-10 pb-20 space-y-10"
          >
            {/* Grid of Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InsightCard
                title="Network Health"
                value="98.2%"
                trend="+0.4%"
                status="optimal"
                description="Overall system stability across all confirmed backbone nodes."
              />
              <InsightCard
                title="Active Sessions"
                value="1,284"
                trend="+12%"
                status="active"
                description="Real-time traffic sessions processed by identified gateway routers."
              />
              <InsightCard
                title="Security Score"
                value="A+"
                trend="Stable"
                status="secure"
                description="Security posture based on AI analysis of network topology."
              />
            </div>

            {/* Performance Chart Placeholder */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white">Traffic Performance</h3>
                  <p className="text-sm text-slate-500">Real-time throughput analysis for enhanced links</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold">24H</span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold">7D</span>
                </div>
              </div>
              <div className="h-64 w-full bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center">
                <p className="text-slate-600 font-medium italic">Performance Graph Data Visualization</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer Stats - Only show when SVG uploaded */}
        <AnimatePresence>
          {uploadedSvg && (
            <motion.footer
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="sticky bottom-8 left-1/2 -translate-x-1/2 w-fit px-8 py-4 rounded-2xl glass-panel border border-slate-800/50 flex items-center gap-12 z-20 mx-auto"
            >
              <StatItem label="Mode" value="2D SVG" />
              <div className="w-px h-8 bg-slate-800" />
              <StatItem label="Zoom" value="Interactive" />
              <div className="w-px h-8 bg-slate-800" />
              <StatItem label="Engine" value="GPU Accelerated" />
            </motion.footer>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Comparison Sidebar */}
      <AnimatePresence>
        {showComparison && (
          <ComparisonPanel onClose={() => setShowComparison(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

const NavItem = ({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
    ${active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
    {icon}
  </button>
);

const StatItem = ({ label, value }: { label: string, value: string }) => (
  <div className="text-center min-w-[100px]">
    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm text-white font-black uppercase italic tracking-tighter">{value}</p>
  </div>
);

const InsightCard = ({ title, value, trend, status, description }: any) => (
  <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 hover:border-blue-500/30 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{title}</p>
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status === 'optimal' || status === 'secure' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
        }`}>
        {trend}
      </span>
    </div>
    <div className="flex items-baseline gap-2 mb-2">
      <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
    </div>
    <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
      {description}
    </p>
  </div>
);

export default App;
