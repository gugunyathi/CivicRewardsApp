import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Layers,
  Map as MapIcon,
  Plus,
  User,
  X,
} from 'lucide-react';
import { AiAssistantIcon } from './AiAssistantIcon';

interface FloatingMenuProps {
  emergencyMode: boolean;
  onOpenReport: () => void;
  onOpenMap: () => void;
  onOpenAssistant: () => void;
  onToggleEmergency: () => void;
  onOpenWardPicker: () => void;
  onOpenProfile: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = React.memo(({
  emergencyMode,
  onOpenReport,
  onOpenMap,
  onOpenAssistant,
  onToggleEmergency,
  onOpenWardPicker,
  onOpenProfile,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const actions = [
    {
      label: 'REPORT FAULT',
      icon: Plus,
      onClick: () => {
        setExpanded(false);
        onOpenReport();
      },
      tone: 'bg-red-600 hover:bg-red-700 text-white border-red-500 text-sm font-extrabold uppercase tracking-wider',
    },
    {
      label: 'Live Map',
      icon: MapIcon,
      onClick: () => {
        setExpanded(false);
        onOpenMap();
      },
      tone: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/12',
    },
    {
      label: 'Civic Assistant',
      icon: AiAssistantIcon,
      onClick: () => {
        setExpanded(false);
        onOpenAssistant();
      },
      tone: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/12',
    },
    {
      label: 'My Profile & Bills',
      icon: User,
      onClick: () => {
        setExpanded(false);
        onOpenProfile();
      },
      tone: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/12',
    },
    {
      label: 'Switch Ward',
      icon: Compass,
      onClick: () => {
        setExpanded(false);
        onOpenWardPicker();
      },
      tone: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-slate-200/80 dark:border-white/12',
    },
    {
      label: emergencyMode ? 'Exit SOS' : 'SOS Alert',
      icon: AlertTriangle,
      onClick: () => {
        setExpanded(false);
        onToggleEmergency();
      },
      tone: emergencyMode
        ? 'bg-red-600 text-white border-red-500'
        : 'bg-white dark:bg-[#111827] text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
    },
  ];

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-[2px] ui-backdrop-enter"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-[72px] lg:bottom-6 right-3 sm:right-5 z-40 flex flex-col items-end gap-2">
        {expanded && (
          <div className="flex flex-col items-end gap-1.5 mb-1 ui-modal-enter">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.label}
                  type="button"
                  onClick={act.onClick}
                  className={`min-h-[42px] px-4 py-2 rounded-xl border shadow-md shadow-slate-900/10 flex items-center gap-2 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer ${
                    act.label === 'REPORT FAULT' ? '' : 'text-xs font-semibold '
                  }${act.tone}`}
                >
                  <span>{act.label}</span>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide quick floating menu' : 'Show quick floating menu'}
          className="w-12 h-12 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 border border-slate-800/20 dark:border-white/20 shadow-lg shadow-slate-900/20 flex items-center justify-center active:scale-95 transition-transform duration-150 cursor-pointer"
        >
          {expanded ? <X className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
});
