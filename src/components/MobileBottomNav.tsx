import React from 'react';
import { ClipboardCheck, Home, Layers, Map as MapIcon, Radio, User } from 'lucide-react';
import type { AppView, UserRole } from '../types/civic';

interface MobileBottomNavProps {
  activeView: AppView;
  role: UserRole;
  onSelectView: (view: AppView) => void;
}

const RESIDENT_TABS: Array<{
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'hub', label: 'Services', icon: Home },
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'social', label: 'Pulse', icon: Radio },
  { id: 'profile', label: 'Profile', icon: User },
];

const COUNCILLOR_TABS: Array<{
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'hub', label: 'Services', icon: Home },
  { id: 'feed', label: 'Feed', icon: Layers },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'desk', label: 'Desk', icon: ClipboardCheck },
  { id: 'profile', label: 'Profile', icon: User },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(({
  activeView,
  role,
  onSelectView,
}) => {
  const tabs = role === 'councillor' ? COUNCILLOR_TABS : RESIDENT_TABS;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-white/95 dark:bg-[#0B0F17]/90 backdrop-blur-md border-t border-slate-300 dark:border-white/[0.08]"
    >
      <div className="grid grid-cols-5 h-full items-center max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            activeView === tab.id || (tab.id === 'profile' && activeView === 'rewards');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.95] transition-[transform,color] duration-150 ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-700 dark:text-slate-400 font-medium'
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
