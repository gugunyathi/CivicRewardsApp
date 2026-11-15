import React, { useState } from 'react';
import { Check, Copy, Hash, RefreshCw } from 'lucide-react';
import { copyText } from '../utils/clipboard';

interface RefBadgeProps {
  value: string | null;
  onGenerate?: () => void;
  generateLabel?: string;
  className?: string;
}

export const RefBadge: React.FC<RefBadgeProps> = React.memo(({
  value,
  onGenerate,
  generateLabel = 'Generate',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">No ref</span>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-white/12 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
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
      <Hash className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0" />
      <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
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
        className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-white/5 active:scale-95 transition-[transform,color,background-color] duration-150 cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
});
