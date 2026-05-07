import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Circle } from 'lucide-react';

export type UploadStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface UploadStep {
  id: string;
  label: string;
  status: UploadStepStatus;
  progress?: number;
  error?: string;
}

interface UploadProgressProps {
  steps: UploadStep[];
  className?: string;
}

const UploadProgress = ({ steps, className = '' }: UploadProgressProps) => {
  const getStepIcon = (status: UploadStepStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Circle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStepColor = (status: UploadStepStatus) => {
    switch (status) {
      case 'done':
        return 'border-emerald-500/30 bg-emerald-500/10';
      case 'running':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-slate-700/30 bg-slate-800/20';
    }
  };

  const getProgressBarColor = (status: UploadStepStatus) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500';
      case 'running':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-xl border p-4 transition-all duration-300 ${getStepColor(step.status)}`}
        >
          <div className="flex items-center gap-3">
            {/* Step Number/Icon */}
            <div className="flex-shrink-0">
              {getStepIcon(step.status)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">
                  {step.label}
                </h4>
                {step.status === 'running' && step.progress !== undefined && (
                  <span className="text-xs font-mono text-blue-400">
                    {step.progress}%
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {step.status === 'running' && step.progress !== undefined && (
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full ${getProgressBarColor(step.status)}`}
                  />
                </div>
              )}

              {/* Error Message */}
              {step.status === 'error' && step.error && (
                <p className="text-xs text-red-400 mt-1">{step.error}</p>
              )}
            </div>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[18px] top-full w-0.5 h-3 bg-slate-700/50" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default UploadProgress;

// Made with Bob
