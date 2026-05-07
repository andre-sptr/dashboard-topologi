import { motion } from 'framer-motion';
import { X, Activity, Server, Zap, Globe, Database } from 'lucide-react';

interface DetailsSidebarProps {
  selectedItem: any;
  onClose: () => void;
}

const DetailsSidebar = ({ selectedItem, onClose }: DetailsSidebarProps) => {
  if (!selectedItem) return null;

  const isNode = selectedItem.data && !selectedItem.source;
  const data = selectedItem.data || selectedItem;

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="details-sidebar glass-panel"
    >
      <div className="sidebar-header">
        <div className="header-info">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`type-badge ${isNode ? data.type?.toLowerCase() : 'link'}`}
          >
            {isNode ? <Server size={12} /> : <Zap size={12} />}
            <span>{isNode ? data.type : 'BACKBONE LINK'}</span>
          </motion.div>
          <motion.h3
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="sidebar-title"
          >
            {data.label}
          </motion.h3>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-content">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="info-section"
        >
          <h4 className="section-label">Real-time Metrics</h4>
          <div className="metrics-grid">
            <MetricCard
              icon={<Activity size={16} />}
              label="Utilization"
              value={isNode ? "42%" : "68%"}
              trend="+2.4%"
              color="var(--color-primary)"
            />
            <MetricCard
              icon={<Zap size={16} />}
              label="Latency"
              value={isNode ? "0.4ms" : "2.1ms"}
              trend="-0.1ms"
              color="var(--color-success)"
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="info-section"
        >
          <h4 className="section-label">Hardware Details</h4>
          <div className="detail-list">
            <DetailItem label="Status" value="Operational" status="online" />
            <DetailItem label="Location" value={isNode ? "Batam Data Center" : "Subsea Cable PRB"} />
            <DetailItem label="Manufacturer" value="Nokia / Huawei" />
            {isNode ? (
              <>
                <DetailItem label="IP Address" value="10.254.0.1" />
                <DetailItem label="Ports Active" value="14 / 48" />
              </>
            ) : (
              <>
                <DetailItem label="Capacity" value="100G x 48" />
                <DetailItem label="Distance" value="20 KM" />
              </>
            )}
          </div>
        </motion.section>
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="sidebar-footer"
      >
        <button className="action-btn primary">
          <Globe size={16} />
          <span>Full Diagnostics</span>
        </button>
        <button className="action-btn secondary">
          <Database size={16} />
          <span>View Logs</span>
        </button>
      </motion.div>
    </motion.aside>
  );
};

const MetricCard = ({ icon, label, value, trend, color }: any) => (
  <div className="metric-card glass-card">
    <div className="metric-header">
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <span className="metric-trend">{trend}</span>
    </div>
    <div className="metric-value">{value}</div>
    <div className="metric-label">{label}</div>
  </div>
);

const DetailItem = ({ label, value, status }: any) => (
  <div className="detail-item">
    <span className="detail-label">{label}</span>
    <div className="detail-value-container">
      {status && <span className={`status-dot ${status}`} />}
      <span className="detail-value">{value}</span>
    </div>
  </div>
);

export default DetailsSidebar;
