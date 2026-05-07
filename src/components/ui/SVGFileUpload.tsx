import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileType, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/topologyStore';
import { parseSvgContent } from '../../utils/svgParser';

const SVGFileUpload = () => {
  const setUploadedSvg = useTopologyStore((state) => state.setUploadedSvg);
  const uploadedSvg = useTopologyStore((state) => state.uploadedSvg);
  const setTopology = useTopologyStore((state) => state.setTopology);
  const setLoading = useTopologyStore((state) => state.setLoading);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'image/svg+xml') {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        try {
          // 1. Parse SVG Content
          const { elements, viewBox, assets } = parseSvgContent(content);
          
          // 2. Kirim ke Backend
          const response = await fetch('http://localhost:3002/api/topologies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              viewBox,
              elements,
              assets
            })
          });
          
          if (!response.ok) throw new Error('Gagal mengupload ke database');
          
          const data = await response.json();
          
          // 3. Update Store
          setTopology(data.id, data.elements, data.viewBox, assets);
          setUploadedSvg(content);
        } catch (error) {
          console.error(error);
          alert('Error parsing atau mengupload SVG');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
  }, [setUploadedSvg, setTopology, setLoading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/svg+xml': ['.svg'] },
    multiple: false
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-500 
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/60'}`}
      >
        <input {...getInputProps()} />

        <div className="px-8 py-12 flex flex-col items-center text-center">
          <motion.div
            animate={{ y: isDragActive ? -10 : 0 }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500
              ${isDragActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <h3 className="text-xl font-bold text-white mb-2">
            {isDragActive ? 'Drop file di sini' : 'Upload File Topologi'}
          </h3>
          <p className="text-slate-400 mb-6 max-w-xs">
            Drag & drop file <span className="text-blue-400 font-semibold">.svg</span> Anda di sini atau klik untuk memilih file
          </p>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50">
              <FileType className="w-3.5 h-3.5 text-blue-400" />
              SVG Format
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Auto-render
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <AnimatePresence>
        {uploadedSvg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">File Berhasil Dimuat</p>
                <p className="text-xs text-emerald-500/70">Topologi 2D siap ditampilkan</p>
              </div>
            </div>
            <button
              onClick={() => setUploadedSvg(null)}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              HAPUS
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SVGFileUpload;
