import React, { useState } from 'react';
import { Expand, MapPin } from 'lucide-react';
import { osmDirectionsUrl, staticTileUrl } from '../utils/mapTiles';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  zoom?: number;
  darkMode?: boolean;
  label?: string;
  pinColor?: string;
  className?: string;
  onExpand?: () => void;
}

export const MiniMapPreview: React.FC<MiniMapPreviewProps> = React.memo(({
  lat,
  lng,
  zoom = 13,
  darkMode = true,
  label,
  pinColor = '#059669',
  className = 'h-28 w-full',
  onExpand,
}) => {
  const [tileFailed, setTileFailed] = useState(false);
  const tileUrl = staticTileUrl(lat, lng, zoom, darkMode);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 ${className}`}>
      {!tileFailed ? (
        <img
          src={tileUrl}
          alt={label ?? `Map near ${lat.toFixed(3)}, ${lng.toFixed(3)}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setTileFailed(true)}
          className="absolute inset-0 w-full h-full object-cover scale-150"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-200 dark:bg-slate-900"
        />
      )}

      {/* Clean center pin */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
          style={{ backgroundColor: pinColor }}
        >
          <MapPin className="w-3.5 h-3.5 text-white" />
        </span>
      </div>

      {/* Bottom label bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2.5 py-1 bg-slate-950/75 text-white">
        <span className="font-mono text-[10px] truncate tabular-nums">
          {label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <a
            href={osmDirectionsUrl(lat, lng)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open in OpenStreetMap"
            className="font-mono text-[10px] text-emerald-300 hover:text-white underline"
          >
            OSM
          </a>
          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              title="Open live map"
              aria-label="Open live map"
              className="p-0.5 text-white/90 hover:text-white active:scale-95 transition-transform cursor-pointer"
            >
              <Expand className="w-3 h-3" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
});
