import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Trash2, Calendar, FileText, ChevronRight, HardDrive, Search, AlertCircle } from 'lucide-react';

interface Topology {
  id: string;
  name: string;
  createdAt: string;
  isEnhanced: boolean;
  sourceType: string;
  networkSummary: string | null;
}

const StoragePage = () => {
  const [topologies, setTopologies] = useState<Topology[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTopologies = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3002/api/topologies');
      const data = await res.json();
      setTopologies(data);
    } catch (error) {
      console.error('Failed to fetch topologies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopologies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this topology? This action cannot be undone.')) return;
    
    try {
      setDeletingId(id);
      const res = await fetch(`http://localhost:3002/api/topologies/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setTopologies(prev => prev.filter(t => t.id !== id));
      } else {
        alert('Failed to delete topology');
      }
    } catch (error) {
      console.error('Error deleting topology:', error);
      alert('Error deleting topology');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTopologies = topologies.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sourceType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col gap-6"
    >
      {/* Top Bar with Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search topologies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-6 px-6 py-3 rounded-2xl bg-slate-900/40 border border-slate-800/50">
          <div className="flex items-center gap-3">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">{topologies.length} <span className="text-slate-500 font-normal">Stored</span></span>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              {topologies.filter(t => t.isEnhanced).length} <span className="text-slate-500 font-normal">AI Enhanced</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table / List View */}
      <div className="flex-1 glass-panel rounded-3xl border border-slate-800/50 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-slate-800 bg-slate-900/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="col-span-5">Name & Source</div>
          <div className="col-span-2">Date Added</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 animate-pulse">Loading Storage...</p>
              </div>
            </div>
          ) : filteredTopologies.length === 0 ? (
            <div className="h-full flex items-center justify-center pt-20">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-700">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Topologies Found</h3>
                <p className="text-sm text-slate-500">
                  {searchTerm ? `No results for "${searchTerm}"` : 'Upload your first SVG in the dashboard to see it here.'}
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {filteredTopologies.map((topology, index) => (
                <motion.div
                  key={topology.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-8 py-6 items-center border-b border-slate-800/50 hover:bg-white/[0.02] transition-all group"
                >
                  <div className="col-span-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-blue-400 border border-slate-700/30 group-hover:border-blue-500/30 transition-all">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{topology.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{topology.sourceType || 'generic'}</p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs">{new Date(topology.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    {topology.isEnhanced ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        AI ENHANCED
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-500">
                        RAW SVG
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-3">
                    <button 
                      className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                      title="View Details"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(topology.id)}
                      disabled={deletingId === topology.id}
                      className={`p-2 rounded-lg transition-all ${
                        deletingId === topology.id 
                          ? 'bg-slate-800 text-slate-600' 
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                      }`}
                      title="Delete Topology"
                    >
                      {deletingId === topology.id ? (
                        <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StoragePage;
