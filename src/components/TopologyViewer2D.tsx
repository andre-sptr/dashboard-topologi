import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useTopologyStore } from '../store/topologyStore';
import DraggableSvgItem from './DraggableSvgItem';

const TopologyViewer2D = () => {
  const uploadedSvg = useTopologyStore((state) => state.uploadedSvg);
  const topologyElements = useTopologyStore((state) => state.topologyElements);
  const topologyAssets = useTopologyStore((state) => state.topologyAssets);
  const viewBox = useTopologyStore((state) => state.viewBox);

  if (!uploadedSvg) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/30 bg-[#020617]"
    >
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={10}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Toolbar Kontrol Premium */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => zoomIn()}
                className="w-12 h-12 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 transition-all flex items-center justify-center shadow-2xl"
              >
                <ZoomIn className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => zoomOut()}
                className="w-12 h-12 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 transition-all flex items-center justify-center shadow-2xl"
              >
                <ZoomOut className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => resetTransform()}
                className="w-12 h-12 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 transition-all flex items-center justify-center shadow-2xl"
              >
                <Maximize2 className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Info Hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/5 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 flex items-center gap-3 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              INTERACTIVE CANVAS MODE
            </div>

            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
                background: 'transparent',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="svg-viewer-container w-full h-full flex items-center justify-center p-20">
                {topologyElements.length > 0 ? (
                  <svg
                    viewBox={viewBox}
                    className="w-full h-full drop-shadow-[0_0_15px_rgba(0,100,255,0.1)]"
                    style={{ minWidth: '800px', minHeight: '600px', overflow: 'visible' }}
                  >
                    {/* Render Assets (Gradients, Filters, etc) */}
                    <defs>
                      {topologyAssets.map((asset, index) => (
                        <g key={`asset-${index}`} dangerouslySetInnerHTML={{ __html: asset.content }} />
                      ))}

                      {/* Global Glow Filter */}
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>

                      {/* Neon Effect Filter */}
                      <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {topologyElements.map((el, index) => (
                      <DraggableSvgItem
                        key={el.id}
                        element={el}
                        index={index} // Untuk stagger animation
                      />
                    ))}
                  </svg>
                ) : (
                  <div
                    className="opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
                    dangerouslySetInnerHTML={{ __html: uploadedSvg }}
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </motion.div>
  );
};

export default TopologyViewer2D;
