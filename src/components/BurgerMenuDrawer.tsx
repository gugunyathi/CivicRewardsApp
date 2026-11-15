import React, { useEffect } from 'react';
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
  LogIn,
  LogOut,
  User,
  X,
} from 'lucide-react';
import type { AppView, UserProfile, UserRole, WardRecord } from '../types/civic';

interface BurgerMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeWard: WardRecord;
  user: UserProfile;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  activeTicketCount?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  onOpenAuthModal: () => void;
  onOpenAssistant: () => void;
  onSignOut?: () => void;
}

const MENU_ITEMS: Array<{
  id: AppView;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  councillorOnly?: boolean;
}> = [
  { id: 'hub', label: 'Municipal Services', hint: '10 service channels', icon: Home },
  { id: 'feed', label: 'Ward Feed', hint: 'Live verified reports', icon: Layers },
  { id: 'map', label: 'Live Map', hint: 'Pins & ward boundaries', icon: MapIcon },
  { id: 'desk', label: 'Councillor Desk', hint: 'SLA queue & routing', icon: ClipboardCheck, councillorOnly: true },
  { id: 'social', label: 'Social Pulse', hint: 'WhatsApp & group alerts', icon: Radio },
  { id: 'directory', label: 'Ward Directory', hint: 'Metros & councillors', icon: Building2 },
  { id: 'rewards', label: 'Profile, Bills & Rewards', hint: 'Reports, bills & vouchers', icon: User },
];

export const BurgerMenuDrawer: React.FC<BurgerMenuDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  activeWard,
  user,
  role,
  onChangeRole,
  activeTicketCount,
  darkMode,
  onToggleDarkMode,
  emergencyMode,
  onToggleEmergency,
  onOpenAuthModal,
  onOpenAssistant,
  onSignOut,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleMenuItems = MENU_ITEMS.filter((item) => !item.councillorOnly || role === 'councillor');

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation Menu">
      <div className="w-80 max-w-[85vw] h-full bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-white/10 rounded-r-2xl flex flex-col justify-between shadow-xl shadow-slate-900/15 ui-drawer-left overflow-hidden">
        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/assets/logo-mark.png"
                alt="CivicRewards logo"
                className="w-9 h-9 rounded-xl bg-white p-0.5 border border-slate-200/80 dark:border-white/15 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  CivicRewards
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {role === 'councillor' ? 'Councillor Desk Mode' : 'Resident Citizen Portal'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 active:scale-95 transition-[transform,background-color] duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top of Burger Menu: Sign In / Account Status */}
          {!user.signedIn ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectView('profile');
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.name}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                  {user.mobileZa || user.emailOrHandle || 'Citizen'} · {user.credits} CR
                </div>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 cursor-pointer shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Resident / Councillor Role Switcher */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              View Mode
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => onChangeRole('resident')}
                aria-pressed={role === 'resident'}
                className={`min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                  role === 'resident'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Resident
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('councillor')}
                aria-pressed={role === 'councillor'}
                className={`min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                  role === 'councillor'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Councillor
              </button>
            </div>
          </div>

          {/* Active Ward Profile Card */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuthModal();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] hover:border-emerald-600/50 space-y-1 active:scale-[0.98] transition-[transform,border-color] duration-150 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                Ward {activeWard.wardNumber} · {activeWard.municipalityCode}
              </span>
              <span className="font-semibold">{user.credits} CR</span>
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
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const active =
                activeView === item.id ||
                ((item.id === 'rewards' || item.id === 'profile') &&
                  (activeView === 'rewards' || activeView === 'profile'));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    onClose();
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-3 text-left border active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                      : 'border-transparent hover:bg-slate-100/80 dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        active ? 'opacity-75' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.hint}
                    </div>
                  </div>
                  {item.id === 'desk' && typeof activeTicketCount === 'number' && activeTicketCount > 0 && (
                    <span className="font-mono text-[10px] ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shrink-0">
                      {activeTicketCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Drawer Utilities */}
        <div className="p-5 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAssistant();
            }}
            className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-200/80 dark:border-white/12 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-2 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Open Civic Assistant</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="min-h-[42px] px-3 rounded-xl border border-slate-200/80 dark:border-white/12 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleEmergency}
              className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer ${
                emergencyMode
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{emergencyMode ? 'SOS On' : 'SOS'}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm ui-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>
  );
};
