import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Menu,
  Moon,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import type { AppView, UserProfile, WardRecord } from '../types/civic';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeWard: WardRecord;
  user: UserProfile;
  activeTicketCount: number;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuthModal: () => void;
  onOpenBurgerMenu: () => void;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'hub', label: 'Categories' },
  { id: 'feed', label: 'Ward Feed' },
  { id: 'map', label: 'Live Map' },
  { id: 'desk', label: 'Desk' },
  { id: 'social', label: 'Pulse' },
  { id: 'directory', label: 'Directory' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'profile', label: 'Profile' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  activeWard,
  user,
  activeTicketCount,
  emergencyMode,
  onToggleEmergency,
  darkMode,
  onToggleDarkMode,
  onOpenAuthModal,
  onOpenBurgerMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-slate-200 dark:border-white/12 bg-white/85 dark:bg-[#05070B]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 lg:gap-4">
        {/* Zone 1: Burger Trigger + Brand + Active Ward */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenBurgerMenu}
            aria-label="Open navigation menu"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => onSelectView('hub')}
            className="flex items-center gap-1.5 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>CivicPulse</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Switch Ward or Manage Citizen Profile"
            className="hidden sm:flex items-center gap-1.5 min-h-[34px] px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/10 text-left transition-colors min-w-0 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
              W{activeWard.wardNumber} · {activeWard.municipalityCode}
            </span>
          </button>
        </div>

        {/* Zone 2: Desktop Page Tabs */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-medium" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-sky-500 dark:border-sky-400 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Utilities + Queue Counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectView('rewards')}
            className="hidden sm:flex items-center min-h-[34px] px-2 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap shrink-0 cursor-pointer"
            title="CivicRewards Balance"
          >
            {user.credits} CR
          </button>

          <button
            type="button"
            onClick={onToggleEmergency}
            aria-pressed={emergencyMode}
            title="Toggle Emergency SOS Mode"
            className={`min-h-[34px] px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              emergencyMode
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{emergencyMode ? 'SOS ON' : 'SOS'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onSelectView('desk')}
            className="hidden sm:flex min-h-[34px] px-2.5 py-1 border border-slate-300 dark:border-white/30 hover:border-slate-900 dark:hover:border-white text-[11px] font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors items-center"
          >
            Queue [ {String(activeTicketCount).padStart(2, '0')} ]
          </button>

          <button
            type="button"
            onClick={() => onSelectView('profile')}
            aria-label="Open User Profile & Bills"
            title={`${user.name} · Profile, Points & Municipal Bills`}
            className={`min-h-[36px] min-w-[36px] px-2 flex items-center justify-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
              activeView === 'profile'
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'border-slate-300 dark:border-white/25 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:border-sky-500'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-semibold">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
