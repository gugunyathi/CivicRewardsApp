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
  Waves,
  Zap,
} from 'lucide-react';
import type { ServiceCategoryId } from '../types/civic';

const CATEGORY_VISUALS: Record<
  ServiceCategoryId,
  { icon: React.ComponentType<{ className?: string; color?: string }>; bg: string; fg: string }
> = {
  water: { icon: Droplets, bg: '#0f293a', fg: '#7dd3fc' },
  electricity: { icon: Zap, bg: '#2d1c08', fg: '#fbbf24' },
  waste: { icon: Trash2, bg: '#1e293b', fg: '#94a3b8' },
  sanitation: { icon: Waves, bg: '#0d2b30', fg: '#2dd4bf' },
  roads: { icon: Route, bg: '#0b2619', fg: '#4ade80' },
  streetlights: { icon: Lightbulb, bg: '#2c1d07', fg: '#fde047' },
  parks: { icon: Trees, bg: '#0b2619', fg: '#86efac' },
  safety: { icon: Shield, bg: '#172554', fg: '#93c5fd' },
  accounts: { icon: CreditCard, bg: '#112a36', fg: '#67e8f9' },
  anticorruption: { icon: Lock, bg: '#33111c', fg: '#fda4af' },
  notices: { icon: ClipboardList, bg: '#1e1b4b', fg: '#a5b4fc' },
};

interface SmartImageProps {
  src?: string | null;
  alt: string;
  categoryId?: ServiceCategoryId;
  label?: string;
  icon?: React.ComponentType<{ className?: string; color?: string }>;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = React.memo(({
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
  const bg = visual?.bg ?? '#111827';
  const fg = visual?.fg ?? '#34d399';

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative overflow-hidden flex flex-col items-center justify-center gap-1.5 p-3 text-center ${className}`}
        style={{ backgroundColor: bg }}
      >
        <FallbackIcon className="w-6 h-6 relative" color={fg} />
        <span className="relative text-[11px] font-medium text-white/90 leading-tight line-clamp-1">
          {label ?? alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className={imgClassName}
      />
    </div>
  );
});

const AVATAR_COLORS = [
  ['#0f293a', '#7dd3fc'],
  ['#0b2619', '#4ade80'],
  ['#33111c', '#fda4af'],
  ['#2d1c08', '#fbbf24'],
  ['#172554', '#93c5fd'],
  ['#112a36', '#67e8f9'],
] as const;

export const AvatarPlaceholder: React.FC<{
  name: string;
  className?: string;
  iconClassName?: string;
}> = React.memo(({ name, className = 'w-10 h-10 text-xs', iconClassName = 'w-4 h-4' }) => {
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
      className={`shrink-0 rounded-xl flex items-center justify-center font-semibold font-display ${className}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials || <Bell className={iconClassName} />}
    </div>
  );
});

export const RewardCategoryIcon: React.FC<{ category: string; className?: string }> = React.memo(({
  category,
  className = 'w-4 h-4',
}) => {
  const c = category.toLowerCase();
  if (c.includes('airtime') || c.includes('data')) return <Zap className={className} />;
  if (c.includes('grocer')) return <Gift className={className} />;
  if (c.includes('municipal') || c.includes('rates')) return <CreditCard className={className} />;
  if (c.includes('solar') || c.includes('energy')) return <Lightbulb className={className} />;
  return <Gift className={className} />;
});
