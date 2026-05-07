import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileType, CheckCircle2, AlertTriangle, BarChart3, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/topologyStore';
import { parseSvgContent } from '../../utils/svgParser';
import { parseGoogleSlidesSvgV2 } from '../../utils/googleSlidesSvgParser';
import type { UploadStep } from './UploadProgress';
import { extractVisualDataViaAIVision } from '../../utils/aiVisionLabelExtractor';
import { matchLabelsToNodes, matchEdgesToNodes } from '../../utils/topologyAssembler';
import { inferNodeType } from '../../utils/topologyInferencer';
import { enhanceWithAI } from '../../utils/aiEnhancer';
import UploadProgress from './UploadProgress';

interface ParsingResult {
  nodes: number;
  edges: number;
  canvasSize: string;
  uniqueColors: number;
}

interface SVGFileUploadProps {
  onUploadComplete?: () => void;
}

const SVGFileUpload = ({ onUploadComplete }: SVGFileUploadProps) => {
  const setUploadedSvg = useTopologyStore((state) => state.setUploadedSvg);
  const uploadedSvg = useTopologyStore((state) => state.uploadedSvg);
  const setTopology = useTopologyStore((state) => state.setTopology);
  const setLoading = useTopologyStore((state) => state.setLoading);

  const [contextHint, setContextHint] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([]);
  const [parsingResult, setParsingResult] = useState<ParsingResult | null>(null);
  const [useGoogleSlidesParser, setUseGoogleSlidesParser] = useState(true);

  const updateStep = (stepId: string, updates: Partial<UploadStep>) => {
    setUploadSteps(prev =>
      prev.map(step => step.id === stepId ? { ...step, ...updates } : step)
    );
  };

  const convertParsedToElements = (nodes: any[], edges: any[]) => {
    const elements: any[] = [];

    // Add nodes as elements
    nodes.forEach((node, index) => {
      elements.push({
        type: 'image',
        props: {
          id: node.id,
          label: node.label,
          'data-inferred-type': (node as any).inferredType,
          imageDataUri: node.imageDataUri,
        },
        x: node.tx,
        y: node.ty,
        transform: '',
        zIndex: index,
      });
    });

    // Add edges as elements
    edges.forEach((edge, index) => {
      elements.push({
        type: 'path',
        props: {
          id: edge.id,
          stroke: edge.strokeColor,
          'stroke-width': edge.strokeWidth,
          'stroke-dasharray': edge.isDashed ? '5,5' : undefined,
          'data-source': edge.sourceNodeId,
          'data-target': edge.targetNodeId,
          'data-edge-type': edge.edgeType,
        },
        x: edge.startX,
        y: edge.startY,
        transform: '',
        zIndex: nodes.length + index,
      });
    });

    return elements;
  };


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'image/svg+xml') {
      setLoading(true);
      setShowProgress(true);
      setParsingResult(null);

      // Initialize upload steps
      const initialSteps: UploadStep[] = [
        { id: 'parse', label: 'Parsing SVG structure', status: 'pending' },
        { id: 'ai', label: 'AI Enhancement', status: 'pending' },
        { id: 'save', label: 'Saving to database', status: 'pending' },
      ];
      setUploadSteps(initialSteps);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;

        try {
          // Step 1: Parse SVG
          updateStep('parse', { status: 'running', progress: 0 });

          let elements: any[] = [];
          let viewBox = '';
          let assets: any[] = [];
          let aiResult = null;

          if (useGoogleSlidesParser) {
            // PHASE 1: Parse Structure (Nodes, Path D-strings, Label Regions)
            updateStep('parse', { status: 'running', progress: 10 });
            const v2Result = parseGoogleSlidesSvgV2(content);
            viewBox = v2Result.viewBox;

            // PHASE 2: AI Vision (OCR Labels & Legend)
            updateStep('parse', { label: 'AI Vision OCR (Labels & Legend)', progress: 30 });
            const visualData = await extractVisualDataViaAIVision(
              content, 
              v2Result.originalWidth, 
              v2Result.originalHeight
            );

            // PHASE 3: Assembly & Enrichment
            updateStep('parse', { label: 'Assembling Topology Graph', progress: 60 });
            const namedNodes = matchLabelsToNodes(v2Result.nodes, visualData.labels, v2Result.labelRegions);
            const typedEdges = matchEdgesToNodes(v2Result.edges, namedNodes, visualData.legend);

            // Inferred types for enhancement step
            namedNodes.forEach(n => (n as any).inferredType = inferNodeType(n as any));
            
            elements = convertParsedToElements(namedNodes, typedEdges);
            
            setParsingResult({
              nodes: namedNodes.length,
              edges: typedEdges.length,
              canvasSize: `${v2Result.originalWidth}x${v2Result.originalHeight}`,
              uniqueColors: visualData.legend.length || 0,
            });

            updateStep('parse', { status: 'done', progress: 100 });

            // Step 3: AI Semantic Enhancement
            updateStep('ai', { status: 'running', progress: 0 });
            try {
              const aiRequest = {
                nodes: namedNodes.map(n => ({
                  id: n.id,
                  label: n.label,
                  inferredType: (n as any).inferredType,
                  fillColor: '#ffffff', // images don't have fill color
                  position: { x: n.tx, y: n.ty }
                })),
                edges: typedEdges.map(e => ({
                  id: e.id,
                  sourceId: e.sourceNodeId,
                  targetId: e.targetNodeId,
                  label: e.edgeType,
                  isDashed: e.isDashed
                })),
                contextHint: contextHint || undefined
              };

              console.log('SVGFileUpload: Starting AI Enhancement phase...');
              aiResult = await enhanceWithAI(aiRequest);
              console.log('SVGFileUpload: AI Enhancement phase complete', aiResult ? 'Success' : 'No result');
              updateStep('ai', { status: 'done', progress: 100 });
            } catch (e) {
              console.warn('AI Enhancement failed', e);
              updateStep('ai', { status: 'done', progress: 100 });
            }
          } else {
            // Legacy Path
            updateStep('parse', { status: 'running', progress: 50 });
            const legacyResult = parseSvgContent(content);
            elements = legacyResult.elements;
            viewBox = legacyResult.viewBox;
            assets = legacyResult.assets;
            updateStep('parse', { status: 'done', progress: 100 });
            updateStep('ai', { status: 'done', progress: 100 });
          }

          // Step 4: Save to database
          updateStep('save', { status: 'running', progress: 0 });

          const response = await fetch('http://localhost:3002/api/topologies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              viewBox,
              elements,
              assets,
              sourceType: useGoogleSlidesParser ? 'google_slides' : 'generic',
              contextHint: contextHint || undefined,
              isEnhanced: !!aiResult,
              enhancedData: aiResult ? JSON.stringify({
                nodes: aiResult.nodes,
                edges: aiResult.edges
              }) : undefined,
              networkSummary: aiResult?.networkSummary,
            })
          });

          updateStep('save', { progress: 50 });

          if (!response.ok) {
            throw new Error('Failed to upload to database');
          }

          const data = await response.json();

          updateStep('save', { progress: 80 });

          // Update Store
          setTopology(
            data.id,
            data.elements,
            data.viewBox,
            assets,
            data.isEnhanced,
            data.enhancedData ? JSON.parse(data.enhancedData) : null,
            data.networkSummary
          );
          setUploadedSvg(content);

          updateStep('save', { status: 'done', progress: 100 });

          // Trigger completion callback
          if (onUploadComplete) onUploadComplete();

        } catch (error) {
          console.error('Upload error:', error);

          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          // Use functional update to avoid stale closure of uploadSteps
          setUploadSteps(prev => 
            prev.map(step => 
              step.status === 'running' 
                ? { ...step, status: 'error', error: errorMessage } 
                : step
            )
          );
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
  }, [setUploadedSvg, setTopology, setLoading, useGoogleSlidesParser, contextHint]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/svg+xml': ['.svg'] },
    multiple: false
  });

  const handleRetryWithLegacyParser = () => {
    setUseGoogleSlidesParser(false);
    setShowProgress(false);
    setParsingResult(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Context Hint Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Network Context (optional)
        </label>
        <input
          type="text"
          value={contextHint}
          onChange={(e) => setContextHint(e.target.value)}
          placeholder="e.g., ISP backbone topology, Data center network..."
          className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <p className="text-xs text-slate-500">
          Helps AI understand your network type for better enhancement
        </p>
      </div>

      {/* Parser Toggle */}
      <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl">
        <input
          type="checkbox"
          id="use-google-parser"
          checked={useGoogleSlidesParser}
          onChange={(e) => setUseGoogleSlidesParser(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
        />
        <label htmlFor="use-google-parser" className="text-sm text-slate-300 cursor-pointer">
          Use Google Slides Parser (recommended for Google Slides exports)
        </label>
      </div>

      {/* Upload Area */}
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
            {isDragActive ? 'Drop file here' : 'Upload Topology File'}
          </h3>
          <p className="text-slate-400 mb-6 max-w-xs">
            Drag & drop your <span className="text-blue-400 font-semibold">.svg</span> file here or click to select
          </p>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50">
              <FileType className="w-3.5 h-3.5 text-blue-400" />
              SVG Format
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Auto-parse
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {showProgress && uploadSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <UploadProgress steps={uploadSteps} />

            {/* Retry with legacy parser option */}
            {uploadSteps.some(s => s.status === 'error') && useGoogleSlidesParser && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleRetryWithLegacyParser}
                className="mt-3 w-full px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Try with Legacy Parser
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsing Results */}
      <AnimatePresence>
        {parsingResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-emerald-400">Parsing Complete</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  <span className="font-semibold text-white">{parsingResult.nodes}</span> nodes,
                  <span className="font-semibold text-white"> {parsingResult.edges}</span> connections
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileType className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Canvas: <span className="font-semibold text-white">{parsingResult.canvasSize}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Found <span className="font-semibold text-white">{parsingResult.uniqueColors}</span> unique colors
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success State */}
      <AnimatePresence>
        {uploadedSvg && !showProgress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">File Successfully Loaded</p>
                <p className="text-xs text-emerald-500/70">2D topology ready to display</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadedSvg(null);
                setParsingResult(null);
                setShowProgress(false);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              REMOVE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SVGFileUpload;

// Made with Bob
