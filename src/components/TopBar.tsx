import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Menu,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import type { AppView, UserProfile, WardRecord } from '../types/civic';
import { InstallButton } from './InstallButton';

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
  { id: 'hub', label: 'Services' },
  { id: 'feed', label: 'Feed' },
  { id: 'map', label: 'Map' },
  { id: 'desk', label: 'Desk' },
  { id: 'social', label: 'Pulse' },
  { id: 'directory', label: 'Directory' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'profile', label: 'Profile' },
];

export const TopBar: React.FC<TopBarProps> = React.memo(({
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
    <header className="sticky top-0 z-40 h-14 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-[#0B0F17]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 lg:gap-4">
        {/* Left: Menu Trigger + Brand + Active Ward */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenBurgerMenu}
            aria-label="Open navigation menu"
            className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => onSelectView('hub')}
            className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform duration-150 cursor-pointer"
          >
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
              C
            </span>
            <span>CivicRewards</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Switch Ward or Manage Profile"
            className="hidden sm:flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left active:scale-[0.98] transition-[transform,background-color] duration-150 min-w-0 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px] tabular-nums">
              Ward {activeWard.wardNumber} · {activeWard.municipalityCode}
            </span>
          </button>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-colors duration-150 active:scale-[0.98] cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Utilities & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <InstallButton />
          <button
            type="button"
            onClick={() => onSelectView('rewards')}
            className="hidden sm:flex items-center min-h-[34px] px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
            title="CivicRewards Balance"
          >
            {user.credits} CR
          </button>

          <button
            type="button"
            onClick={onToggleEmergency}
            aria-pressed={emergencyMode}
            title="Toggle Emergency SOS Mode"
            className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 active:scale-[0.98] transition-[transform,background-color,border-color,color] duration-150 cursor-pointer border ${
              emergencyMode
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-slate-200/80 dark:border-white/12 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{emergencyMode ? 'SOS On' : 'SOS'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onSelectView('desk')}
            className="hidden sm:flex min-h-[34px] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/12 hover:border-slate-300 dark:hover:border-white/25 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap shrink-0 active:scale-[0.98] transition-[transform,border-color] duration-150 cursor-pointer items-center"
          >
            Queue {String(activeTicketCount).padStart(2, '0')}
          </button>

          <button
            type="button"
            onClick={() => onSelectView('profile')}
            aria-label="Open User Profile & Bills"
            title={`${user.name} · Profile & Municipal Bills`}
            className={`min-h-[36px] min-w-[36px] px-2.5 rounded-xl flex items-center justify-center gap-1.5 border active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 cursor-pointer shrink-0 ${
              activeView === 'profile'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-200/80 dark:border-white/12 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/25'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-semibold">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
});
