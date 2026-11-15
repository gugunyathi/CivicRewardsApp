import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Compass,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { UserProfile, WardRecord } from '../types/civic';
import { resolveWardByCoordinates, resolveWardByQuery } from '../utils/wardResolver';
import { InteractiveMap } from './InteractiveMap';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  activeWard: WardRecord;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSelectWard: (wardId: string, bindAsHome: boolean) => void;
  onAuthSuccess?: (profile: any) => void;
  onSignOut?: () => void;
}

const QUICK_METRO_PRESETS = [
  { wardId: 'CoJ-115', label: 'Fourways · W115 (CoJ)' },
  { wardId: 'CoJ-103', label: 'Sandton · W103 (CoJ)' },
  { wardId: 'CoCT-54', label: 'Sea Point · W54 (CoCT)' },
  { wardId: 'CoT-82', label: 'Lynnwood · W82 (CoT)' },
  { wardId: 'eThekwini-35', label: 'Umhlanga · W35 (eThekwini)' },
  { wardId: 'CoT-57', label: 'Centurion · W57 (CoT)' },
];

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  onClose,
  activeWard,
  onSelectWard,
}) => {
  const [selectedWardId, setSelectedWardId] = useState(activeWard.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const selectedWard = useMemo(
    () => SEED_WARDS.find((w) => w.id === selectedWardId) ?? activeWard,
    [selectedWardId, activeWard]
  );

  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: activeWard.lat,
    lng: activeWard.lng,
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedWardId(activeWard.id);
      setPinCoords({ lat: activeWard.lat, lng: activeWard.lng });
      setGpsStatus(null);
      setSearchQuery('');
    }
  }, [isOpen, activeWard]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEED_WARDS.filter((w) => {
      const hay = [
        `ward ${w.wardNumber}`,
        String(w.wardNumber),
        w.municipalityName,
        w.municipalityCode,
        ...w.suburbs,
        ...w.corridors,
        w.councillor.name,
        w.councillor.party,
        w.depots.water,
        w.depots.electricity,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (ward: WardRecord) => {
    setSelectedWardId(ward.id);
    setPinCoords({ lat: ward.lat, lng: ward.lng });
    setGpsStatus(null);
  };

  const handleLiveGps = () => {
    setIsLocating(true);
    setGpsStatus('Acquiring live GPS location...');

    const apply = (lat: number, lng: number, source: string) => {
      const { ward, distanceMeters } = resolveWardByCoordinates(lat, lng);
      setSelectedWardId(ward.id);
      setPinCoords({ lat, lng });
      setGpsStatus(
        `${source}: Ward ${ward.wardNumber} (${ward.suburbs[0]}) · ${(distanceMeters / 1000).toFixed(1)} km away`
      );
      setIsLocating(false);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => apply(pos.coords.latitude, pos.coords.longitude, 'GPS Detected'),
        () => apply(activeWard.lat, activeWard.lng, 'Metro Fallback'),
        { timeout: 3500 }
      );
    } else {
      apply(activeWard.lat, activeWard.lng, 'Metro Fallback');
    }
  };

  const handleMapPick = (lat: number, lng: number) => {
    setPinCoords({ lat, lng });
    const { ward, distanceMeters } = resolveWardByCoordinates(lat, lng);
    setSelectedWardId(ward.id);
    setGpsStatus(
      `Pin Matched: Ward ${ward.wardNumber} · ${ward.suburbs[0]} (${(distanceMeters / 1000).toFixed(1)} km)`
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelect(searchResults[0]);
      return;
    }
    const matched = resolveWardByQuery(searchQuery);
    if (matched) {
      handleSelect(matched);
      setGpsStatus(`Resolved: ${matched.municipalityCode} Ward ${matched.wardNumber} · ${matched.suburbs[0]}`);
    } else {
      setGpsStatus('No exact ward match. Try "Fourways", "Sandton", "Sea Point", or a ward number.');
    }
  };

  const handleSave = () => {
    onSelectWard(selectedWardId, true);
    onClose();
  };

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm ui-backdrop-enter p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-ward-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden ui-modal-enter">
        {/* Pinned Header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 border border-emerald-600/25 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="my-ward-modal-title"
                className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate"
              >
                My Ward
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Find by address, councillor name, or map pin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 active:scale-95 transition-[transform,background-color] duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5">
          {/* 1. Search Field on Top */}
          <form onSubmit={handleSearchSubmit} className="space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, suburb, councillor, or ward # (e.g. 115)..."
                aria-label="Search municipal ward"
                autoFocus
                className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 dark:focus:ring-emerald-400/25 dark:focus:border-emerald-400 transition-[border-color,box-shadow,background-color] duration-150"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown/List */}
            {searchResults.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06]">
                {searchResults.map((w) => {
                  const isSel = w.id === selectedWardId;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        handleSelect(w);
                        setSearchQuery('');
                      }}
                      className={`w-full p-2.5 text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors duration-150 ${
                        isSel
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {w.municipalityCode} Ward {w.wardNumber} · {w.suburbs[0]}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Councillor: {w.councillor.name} ({w.councillor.party})
                        </div>
                      </div>
                      {isSel && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </form>

          {/* 2. Auto-Detect by GPS Button */}
          <button
            type="button"
            onClick={handleLiveGps}
            disabled={isLocating}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 disabled:opacity-70 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 shadow-sm"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            )}
            <span>{isLocating ? 'Detecting Ward...' : 'Auto-Detect Ward via GPS'}</span>
          </button>

          {/* GPS / Query Feedback Banner */}
          {gpsStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/25 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-mono">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{gpsStatus}</span>
            </div>
          )}

          {/* 3. Quick Metro Presets */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Quick Metro Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_METRO_PRESETS.map((preset) => {
                const active = selectedWardId === preset.wardId;
                return (
                  <button
                    key={preset.wardId}
                    type="button"
                    onClick={() => {
                      const target = SEED_WARDS.find((w) => w.id === preset.wardId);
                      if (target) handleSelect(target);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:border-emerald-600/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Map Pin Locator Toggle & Mapbox Map */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] hover:border-emerald-600/50 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
            >
              <div className="flex items-center gap-2">
                <MapIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{showMap ? 'Hide Mapbox Locator' : 'Find by Pin Location on Map'}</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {showMap ? 'Collapse' : 'Open Map'}
              </span>
            </button>

            {showMap && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden space-y-1">
                <div className="h-48 w-full relative">
                  <InteractiveMap
                    centerLat={pinCoords.lat}
                    centerLng={pinCoords.lng}
                    zoom={13}
                    darkMode={isDark}
                    mode="picker"
                    pickedLat={pinCoords.lat}
                    pickedLng={pinCoords.lng}
                    onPickLocation={handleMapPick}
                    className="w-full h-full"
                  />
                </div>
                <div className="p-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-white/[0.02]">
                  Tap anywhere or drag the pin to identify the ward
                </div>
              </div>
            )}
          </div>

          {/* 5. Selected Ward Card */}
          <div className="p-3.5 rounded-xl border-2 border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-600/5 dark:bg-emerald-400/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {selectedWard.municipalityCode} Ward {selectedWard.wardNumber}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                SLA Score: <strong>{selectedWard.councillor.resolutionScore}%</strong>
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedWard.suburbs.join(', ')}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Councillor: <strong>{selectedWard.councillor.name}</strong> ({selectedWard.councillor.party})
              </div>
            </div>

            <div className="pt-1.5 border-t border-emerald-600/15 dark:border-emerald-400/15 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>Water: {selectedWard.depots.water}</span>
              <span>Electricity: {selectedWard.depots.electricity}</span>
            </div>
          </div>
        </div>

        {/* Pinned Footer: Single Solid Green Save Button */}
        <div className="shrink-0 p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Ward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
