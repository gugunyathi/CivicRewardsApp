import React from 'react';
import { ClipboardCheck, Home, Layers, Map as MapIcon, Radio } from 'lucide-react';
import type { AppView } from '../types/civic';

interface MobileBottomNavProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
}

const MOBILE_TABS: Array<{
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'hub', label: 'Services', icon: Home },
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'desk', label: 'Desk', icon: ClipboardCheck },
  { id: 'social', label: 'Pulse', icon: Radio },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(({
  activeView,
  onSelectView,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-t border-slate-200/80 dark:border-white/[0.08]"
    >
      <div className="grid grid-cols-5 h-full items-center max-w-lg mx-auto px-1">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.95] transition-[transform,color] duration-150 ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
