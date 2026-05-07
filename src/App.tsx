import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Settings2, Activity, Database, BarChart3, ChevronRight } from 'lucide-react';
import { useTopologyStore } from './store/topologyStore';
import SVGFileUpload from './components/ui/SVGFileUpload';
import TopologyViewer2D from './components/TopologyViewer2D';

function App() {
  const uploadedSvg = useTopologyStore((state) => state.uploadedSvg);
  const setTopology = useTopologyStore((state) => state.setTopology);
  const setUploadedSvg = useTopologyStore((state) => state.setUploadedSvg);
  
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
            data.assets ? JSON.parse(data.assets) : []
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
    <div className="relative w-full h-screen bg-slate-950 flex overflow-hidden">
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
          <NavItem icon={<BarChart3 className="w-5 h-5" />} active />
          <NavItem icon={<Database className="w-5 h-5" />} />
          <NavItem icon={<Activity className="w-5 h-5" />} />
          <NavItem icon={<Settings2 className="w-5 h-5" />} />
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-slate-900/50">
          <div>
            <h1 className="text-3xl font-black text-gradient uppercase tracking-tighter">
              Topology <span className="text-blue-500">Dashboard</span>
            </h1>
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
        <div className="flex-1 p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {!uploadedSvg ? (
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
                <SVGFileUpload />
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

        {/* Footer Stats - Only show when SVG uploaded */}
        <AnimatePresence>
          {uploadedSvg && (
            <motion.footer
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl glass-panel border border-slate-800/50 flex items-center gap-12 z-20"
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
    </div>
  );
}

const NavItem = ({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) => (
  <button className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
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

export default App;
