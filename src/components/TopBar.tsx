import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Menu,
  MessageSquareText,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import type { AppView, UserProfile, UserRole, WardRecord } from '../types/civic';
import { InstallButton } from './InstallButton';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeWard: WardRecord;
  user: UserProfile;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  activeTicketCount: number;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuthModal: () => void;
  onOpenBurgerMenu: () => void;
  onOpenAssistant: () => void;
}

const RESIDENT_NAV: Array<{ id: AppView; label: string }> = [
  { id: 'hub', label: 'Services' },
  { id: 'feed', label: 'Feed' },
  { id: 'map', label: 'Map' },
  { id: 'social', label: 'Pulse' },
  { id: 'directory', label: 'Directory' },
  { id: 'profile', label: 'Profile' },
];

const COUNCILLOR_NAV: Array<{ id: AppView; label: string }> = [
  { id: 'hub', label: 'Services' },
  { id: 'feed', label: 'Feed' },
  { id: 'map', label: 'Map' },
  { id: 'desk', label: 'Desk' },
  { id: 'social', label: 'Pulse' },
  { id: 'directory', label: 'Directory' },
  { id: 'profile', label: 'Profile' },
];

export const TopBar: React.FC<TopBarProps> = React.memo(({
  activeView,
  onSelectView,
  activeWard,
  user,
  role,
  onChangeRole,
  activeTicketCount,
  emergencyMode,
  onToggleEmergency,
  darkMode,
  onToggleDarkMode,
  onOpenAuthModal,
  onOpenBurgerMenu,
  onOpenAssistant,
}) => {
  const navItems = role === 'councillor' ? COUNCILLOR_NAV : RESIDENT_NAV;

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
            <img
              src="/assets/logo-mark.png"
              alt="CivicRewards logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white p-0.5 border border-slate-200/80 dark:border-white/15 object-contain shrink-0"
            />
            <span>CivicRewards</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Switch Ward or Manage Profile"
            className="hidden sm:flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left active:scale-[0.98] transition-[transform,background-color] duration-150 min-w-0 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[160px] tabular-nums">
              Ward {activeWard.wardNumber} · {activeWard.municipalityCode}
            </span>
          </button>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium" aria-label="Primary">
          {navItems.map((item) => {
            const active =
              activeView === item.id || (item.id === 'profile' && activeView === 'rewards');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-colors duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'desk' && (
                  <span className="font-mono text-[10px] opacity-80 tabular-nums">
                    ({activeTicketCount})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Role Switcher, Assistant & Utilities */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Resident / Councillor Role Switcher */}
          <div
            role="group"
            aria-label="App view role"
            className="hidden md:flex items-center rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeRole('resident')}
              aria-pressed={role === 'resident'}
              className={`min-h-[28px] px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors duration-150 ${
                role === 'resident'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Resident
            </button>
            <button
              type="button"
              onClick={() => onChangeRole('councillor')}
              aria-pressed={role === 'councillor'}
              className={`min-h-[28px] px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors duration-150 ${
                role === 'councillor'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Councillor
            </button>
          </div>

          <InstallButton />

          <button
            type="button"
            onClick={() => onSelectView('rewards')}
            className="hidden sm:flex items-center min-h-[34px] px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
            title="View Credits & Redeem Vouchers"
          >
            {user.credits} CR
          </button>

          <button
            type="button"
            onClick={onOpenAssistant}
            aria-label="Open Ward Triage Assistant"
            title="Ward Triage Assistant"
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-slate-200/80 dark:border-white/12 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4" />
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
            onClick={() => onSelectView('profile')}
            aria-label="Open User Profile & Bills"
            title={`${user.name} · Profile & Municipal Bills`}
            className={`min-h-[36px] min-w-[36px] px-2.5 rounded-xl flex items-center justify-center gap-1.5 border active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 cursor-pointer shrink-0 ${
              activeView === 'profile' || activeView === 'rewards'
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
