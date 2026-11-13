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

/**
 * Lightweight static map thumbnail using free CARTO/OpenStreetMap tiles.
 * No Leaflet instance — safe to render inside cards and lists.
 */
export const MiniMapPreview: React.FC<MiniMapPreviewProps> = ({
  lat,
  lng,
  zoom = 13,
  darkMode = true,
  label,
  pinColor = '#0284c7',
  className = 'h-28 w-full',
  onExpand,
}) => {
  const [tileFailed, setTileFailed] = useState(false);
  const tileUrl = staticTileUrl(lat, lng, zoom, darkMode);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {!tileFailed ? (
        <img
          src={tileUrl}
          alt={label ?? `Map near ${lat.toFixed(3)}, ${lng.toFixed(3)}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setTileFailed(true)}
          className="absolute inset-0 w-full h-full object-cover scale-150"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            backgroundColor: darkMode ? '#0a0e17' : '#e2e8f0',
          }}
        />
      )}

      {/* Center pin */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-9 h-9 rounded-full opacity-25 animate-ping"
            style={{ backgroundColor: pinColor }}
          />
          <span
            className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
            style={{ backgroundColor: pinColor }}
          >
            <MapPin className="w-3.5 h-3.5 text-white" />
          </span>
        </div>
      </div>

      {/* Bottom label bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2 py-1 bg-black/70 text-white">
        <span className="font-mono text-[10px] truncate">
          {label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <a
            href={osmDirectionsUrl(lat, lng)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open in OpenStreetMap"
            className="font-mono text-[10px] text-sky-300 hover:text-white underline"
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
              className="p-0.5 text-white/90 hover:text-white cursor-pointer"
            >
              <Expand className="w-3 h-3" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
};
