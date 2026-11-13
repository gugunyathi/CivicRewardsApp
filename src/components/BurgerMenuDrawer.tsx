import React from 'react';
import {
  AlertTriangle,
  Award,
  Building2,
  ClipboardCheck,
  Home,
  Layers,
  Map as MapIcon,
  MapPin,
  MessageSquareText,
  Moon,
  Radio,
  Sun,
  User,
  X,
} from 'lucide-react';
import type { AppView, UserProfile, WardRecord } from '../types/civic';

interface BurgerMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeWard: WardRecord;
  user: UserProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  onOpenAuthModal: () => void;
  onOpenAssistant: () => void;
}

const MENU_ITEMS: Array<{
  id: AppView;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'hub', label: 'Categories', hint: '10 Smart Municipal Services', icon: Home },
  { id: 'feed', label: 'Ward Feed', hint: 'Forensic Reports & Clustering', icon: Layers },
  { id: 'map', label: 'Live Map', hint: 'Interactive Street & Pin View', icon: MapIcon },
  { id: 'desk', label: 'Councillor Desk', hint: 'SLA Queue & Depot Routing', icon: ClipboardCheck },
  { id: 'social', label: 'Social Pulse', hint: 'WhatsApp, Telegram & X Bridge', icon: Radio },
  { id: 'directory', label: 'Ward Directory', hint: 'SA Metros & Scorecards', icon: Building2 },
  { id: 'rewards', label: 'CivicRewards', hint: 'Points & Voucher Redemptions', icon: Award },
  { id: 'profile', label: 'My Profile & Bills', hint: 'Reports, Points & Utility Trends', icon: User },
];

export const BurgerMenuDrawer: React.FC<BurgerMenuDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  activeWard,
  user,
  darkMode,
  onToggleDarkMode,
  emergencyMode,
  onToggleEmergency,
  onOpenAuthModal,
  onOpenAssistant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation Menu">
      <div
        className="w-80 max-w-[85vw] h-full bg-white dark:bg-[#060911] border-r border-slate-200 dark:border-white/15 flex flex-col justify-between shadow-2xl"
      >
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/12">
            <div>
              <div className="font-display text-base font-bold text-slate-900 dark:text-white">
                CivicPulse Navigation
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Swipe left / right between pages
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Ward Profile Card */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuthModal();
            }}
            className="w-full text-left p-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 space-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-sky-600 dark:text-sky-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Ward {activeWard.wardNumber} · {activeWard.municipalityCode}
              </span>
              <span>{user.credits} CR</span>
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user.name} · {activeWard.suburbs[0]}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeWard.councillor.name}
            </div>
          </button>

          {/* Pages */}
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    onClose();
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-3 text-left border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/8 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        active ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.hint}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Drawer Utilities */}
        <div className="p-4 border-t border-slate-200 dark:border-white/12 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAssistant();
            }}
            className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4 text-sky-500" />
            <span>Open Gemini Civic AI</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="min-h-[40px] px-3 border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleEmergency}
              className={`min-h-[40px] px-3 border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                emergencyMode
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-red-400/50 text-red-600 dark:text-red-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{emergencyMode ? 'SOS On' : 'SOS'}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>
  );
};
