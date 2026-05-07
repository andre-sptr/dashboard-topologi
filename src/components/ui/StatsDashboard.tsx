import { useTopologyStore } from '../../store/topologyStore';
import { Activity, Wifi, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
  delay?: number;
}

const StatCard = ({ icon, label, value, suffix = '', color, delay = 0 }: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
  
  useEffect(() => {
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [numericValue]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">
          {typeof value === 'number' ? displayValue : value}
          {suffix && <span className="text-lg text-slate-400 ml-1">{suffix}</span>}
        </div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
      </div>
    </motion.div>
  );
};

const StatsDashboard = () => {
  const stats = useTopologyStore((state) => state.stats);
  const viewSettings = useTopologyStore((state) => state.viewSettings);
  
  if (!viewSettings.showStats) return null;
  
  const healthColor = 
    stats.healthScore >= 90 ? 'text-green-400' :
    stats.healthScore >= 70 ? 'text-amber-400' :
    'text-red-400';
  
  const healthBgColor = 
    stats.healthScore >= 90 ? 'bg-green-500' :
    stats.healthScore >= 70 ? 'bg-amber-500' :
    'bg-red-500';
  
  return (
    <div className="fixed bottom-4 left-4 right-4 z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Nodes */}
          <StatCard
            icon={<Activity className="w-5 h-5 text-blue-400" />}
            label="Total Nodes"
            value={stats.totalNodes}
            color="bg-blue-500"
            delay={0}
          />
          
          {/* Active Nodes */}
          <StatCard
            icon={<Wifi className="w-5 h-5 text-green-400" />}
            label="Active Nodes"
            value={stats.activeNodes}
            color="bg-green-500"
            delay={0.1}
          />
          
          {/* Total Connections */}
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            label="Connections"
            value={stats.totalEdges}
            color="bg-purple-500"
            delay={0.2}
          />
          
          {/* Active Connections */}
          <StatCard
            icon={<Wifi className="w-5 h-5 text-cyan-400" />}
            label="Active Links"
            value={stats.activeEdges}
            color="bg-cyan-500"
            delay={0.3}
          />
          
          {/* Health Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${healthBgColor} bg-opacity-20`}>
                <Activity className={`w-5 h-5 ${healthColor}`} />
              </div>
            </div>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${healthColor}`}>
                {stats.healthScore}
                <span className="text-lg text-slate-400 ml-1">%</span>
              </div>
              <div className="text-xs text-slate-400 font-medium">Health Score</div>
            </div>
            {/* Health Bar */}
            <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.healthScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full ${healthBgColor}`}
              />
            </div>
          </motion.div>
          
          {/* Alerts & Warnings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-500 bg-opacity-20">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-red-400">{stats.alerts}</span>
                <span className="text-xs text-slate-400">Alerts</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-400">{stats.warnings}</span>
                <span className="text-xs text-slate-400">Warnings</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Additional Metrics Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-3 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-xl"
        >
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Avg Latency</div>
              <div className="text-lg font-bold text-white">
                {stats.averageLatency.toFixed(1)}
                <span className="text-sm text-slate-400 ml-1">ms</span>
              </div>
            </div>
            <div className="text-center border-x border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Total Bandwidth</div>
              <div className="text-lg font-bold text-white">
                {stats.totalBandwidth >= 1000 
                  ? `${(stats.totalBandwidth / 1000).toFixed(1)} Tbps`
                  : `${stats.totalBandwidth.toFixed(0)} Gbps`
                }
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Utilization</div>
              <div className="text-lg font-bold text-white">
                {stats.utilizationPercentage.toFixed(1)}
                <span className="text-sm text-slate-400 ml-1">%</span>
              </div>
              <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.utilizationPercentage}%` }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className={`h-full ${
                    stats.utilizationPercentage >= 80 ? 'bg-red-500' :
                    stats.utilizationPercentage >= 60 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StatsDashboard;

// Made with Bob
