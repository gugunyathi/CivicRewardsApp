import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Layers,
  Map as MapIcon,
  MessageSquareText,
  Plus,
  User,
  X,
} from 'lucide-react';

interface FloatingMenuProps {
  emergencyMode: boolean;
  onOpenReport: () => void;
  onOpenMap: () => void;
  onOpenAssistant: () => void;
  onToggleEmergency: () => void;
  onOpenWardPicker: () => void;
  onOpenProfile: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  emergencyMode,
  onOpenReport,
  onOpenMap,
  onOpenAssistant,
  onToggleEmergency,
  onOpenWardPicker,
  onOpenProfile,
}) => {
  const [expanded, setExpanded] = useState(false);

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
      tone: 'bg-white dark:bg-[#0B111E] text-slate-900 dark:text-white border-slate-200 dark:border-white/20',
    },
    {
      label: 'Ask Civic AI',
      icon: MessageSquareText,
      onClick: () => {
        setExpanded(false);
        onOpenAssistant();
      },
      tone: 'bg-white dark:bg-[#0B111E] text-slate-900 dark:text-white border-slate-200 dark:border-white/20',
    },
    {
      label: 'My Profile & Bills',
      icon: User,
      onClick: () => {
        setExpanded(false);
        onOpenProfile();
      },
      tone: 'bg-white dark:bg-[#0B111E] text-slate-900 dark:text-white border-slate-200 dark:border-white/20',
    },
    {
      label: 'Switch Ward',
      icon: Compass,
      onClick: () => {
        setExpanded(false);
        onOpenWardPicker();
      },
      tone: 'bg-white dark:bg-[#0B111E] text-slate-900 dark:text-white border-slate-200 dark:border-white/20',
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
        : 'bg-white dark:bg-[#0B111E] text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/40',
    },
  ];

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px]"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-[72px] lg:bottom-6 right-3 sm:right-5 z-40 flex flex-col items-end gap-2">
        {expanded && (
          <div className="flex flex-col items-end gap-1.5 mb-1">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.label}
                  type="button"
                  onClick={act.onClick}
                  className={`min-h-[42px] px-3.5 py-2 border shadow-lg flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
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
          className="w-11 h-11 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 border border-slate-700 dark:border-white shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
        >
          {expanded ? <X className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
};
