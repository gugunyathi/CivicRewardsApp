import React, { useState } from 'react';
import { Check, Copy, Hash, RefreshCw } from 'lucide-react';
import { copyText } from '../utils/clipboard';

interface RefBadgeProps {
  value: string | null;
  onGenerate?: () => void;
  generateLabel?: string;
  className?: string;
}

/** Municipal reference display with one-tap copy + optional provisional generator. */
export const RefBadge: React.FC<RefBadgeProps> = ({
  value,
  onGenerate,
  generateLabel = 'Generate',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="font-mono text-[11px] text-slate-400">NO REF</span>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-slate-300 dark:border-white/25 text-[10px] font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{generateLabel}</span>
          </button>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Hash className="w-3 h-3 text-slate-400 shrink-0" />
      <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </span>
      <button
        type="button"
        onClick={async () => {
          if (await copyText(value)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }
        }}
        title="Copy reference number"
        aria-label="Copy reference number"
        className="p-0.5 text-slate-400 hover:text-sky-500 cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
};
