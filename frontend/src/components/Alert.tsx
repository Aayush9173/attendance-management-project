import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  onClose,
  className = '',
}) => {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  }[type];

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border text-sm transition-all ${styles} ${className}`}
      role="alert"
    >
      {icons}
      <div className="flex-1 min-w-0 break-words leading-relaxed font-medium">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss alert"
          className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
