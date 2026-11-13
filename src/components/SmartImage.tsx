import React, { useState } from 'react';
import {
  Bell,
  Camera,
  ClipboardList,
  CreditCard,
  Droplets,
  Gift,
  Lightbulb,
  Lock,
  Route,
  Shield,
  Trash2,
  Trees,
  Zap,
} from 'lucide-react';
import type { ServiceCategoryId } from '../types/civic';

const CATEGORY_VISUALS: Record<
  ServiceCategoryId,
  { icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }
> = {
  water: { icon: Droplets, bg: '#0c4a6e', fg: '#7dd3fc' },
  electricity: { icon: Zap, bg: '#451a03', fg: '#fbbf24' },
  roads: { icon: Route, bg: '#052e16', fg: '#4ade80' },
  streetlights: { icon: Lightbulb, bg: '#422006', fg: '#fde047' },
  waste: { icon: Trash2, bg: '#1e293b', fg: '#94a3b8' },
  parks: { icon: Trees, bg: '#052e16', fg: '#86efac' },
  safety: { icon: Shield, bg: '#172554', fg: '#93c5fd' },
  accounts: { icon: CreditCard, bg: '#164e63', fg: '#67e8f9' },
  anticorruption: { icon: Lock, bg: '#4c0519', fg: '#fda4af' },
  notices: { icon: ClipboardList, bg: '#1e1b4b', fg: '#a5b4fc' },
};

interface SmartImageProps {
  src?: string | null;
  alt: string;
  categoryId?: ServiceCategoryId;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/**
 * Image with a designed offline-friendly fallback: when the photo is missing
 * or fails to load, renders a category-tinted placeholder with icon + label
 * instead of a broken-image box.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  categoryId,
  label,
  icon,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  eager = false,
}) => {
  const [failed, setFailed] = useState(false);
  const visual = categoryId ? CATEGORY_VISUALS[categoryId] : undefined;
  const FallbackIcon = icon ?? visual?.icon ?? Camera;
  const bg = visual?.bg ?? '#0f172a';
  const fg = visual?.fg ?? '#38bdf8';

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden flex flex-col items-center justify-center gap-1.5 p-3 text-center ${className}`}
        style={{
          background: `linear-gradient(135deg, ${bg} 0%, #020617 130%)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <FallbackIcon className="w-7 h-7 relative" color={fg} />
        <span className="relative text-[11px] font-semibold text-white/90 leading-tight">
          {label ?? alt}
        </span>
        <span className="relative font-mono text-[10px] text-white/50">CivicPulse capture</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={`${imgClassName} ${className}`}
    />
  );
};

const AVATAR_COLORS = [
  ['#0c4a6e', '#7dd3fc'],
  ['#052e16', '#4ade80'],
  ['#4c0519', '#fda4af'],
  ['#451a03', '#fbbf24'],
  ['#172554', '#93c5fd'],
  ['#164e63', '#67e8f9'],
] as const;

export const AvatarPlaceholder: React.FC<{
  name: string;
  className?: string;
  iconClassName?: string;
}> = ({ name, className = 'w-10 h-10 text-xs', iconClassName = 'w-4 h-4' }) => {
  const initials = name
    .replace(/^(Cllr|Mr|Ms|Mrs|Dr)\s+/i, '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [bg, fg] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <div
      aria-hidden="true"
      title={name}
      className={`shrink-0 flex items-center justify-center font-bold font-display ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials || <Bell className={iconClassName} />}
    </div>
  );
};

export const RewardCategoryIcon: React.FC<{ category: string; className?: string }> = ({
  category,
  className = 'w-4 h-4',
}) => {
  const c = category.toLowerCase();
  if (c.includes('airtime') || c.includes('data')) return <Zap className={className} />;
  if (c.includes('grocer')) return <Gift className={className} />;
  if (c.includes('municipal') || c.includes('rates')) return <CreditCard className={className} />;
  if (c.includes('solar') || c.includes('energy')) return <Lightbulb className={className} />;
  return <Gift className={className} />;
};
