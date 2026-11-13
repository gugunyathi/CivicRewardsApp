import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CivicReport, WardRecord } from '../types/civic';
import { BASEMAPS, defaultBasemap, type BasemapId } from '../utils/mapTiles';

interface InteractiveMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  darkMode: boolean;
  /** Free keyless basemap. Defaults from darkMode (dark/streets). */
  basemap?: BasemapId;
  mode: 'picker' | 'explorer';
  className?: string;
  /** When false, disables pan/zoom interaction (preview mode). */
  interactive?: boolean;
  // Picker mode props
  pickedLat?: number;
  pickedLng?: number;
  onPickLocation?: (lat: number, lng: number) => void;
  // Explorer mode props
  reports?: CivicReport[];
  wards?: WardRecord[];
  selectedReportId?: string | null;
  onSelectReport?: (report: CivicReport) => void;
  onSelectWard?: (ward: WardRecord) => void;
}

function statusColor(report: CivicReport): string {
  if (report.forensics.status === 'FLAGGED_SYNTHETIC') return '#dc2626';
  if (report.status === 'Resolved') return '#059669';
  if (report.isEmergency || report.severity === 'CRITICAL') return '#ea580c';
  return '#0284c7';
}

function createPinIcon(color: string, label: string, selected = false, pulse = false) {
  const size = selected ? 36 : 28;
  const ring = selected
    ? `<circle cx="18" cy="18" r="15" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2" />`
    : '';
  return L.divIcon({
    className: `civic-map-pin${pulse ? ' civic-map-pin-pulse' : ''}`,
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${ring}
        <circle cx="18" cy="18" r="10" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
        <text x="18" y="21.5" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="700" font-family="monospace">${label}</text>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  centerLat,
  centerLng,
  zoom = 13,
  darkMode,
  basemap,
  mode,
  className = 'h-64 w-full',
  interactive = true,
  pickedLat,
  pickedLng,
  onPickLocation,
  reports = [],
  wards = [],
  selectedReportId,
  onSelectReport,
  onSelectWard,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const callbacksRef = useRef({ onPickLocation, onSelectReport, onSelectWard });
  callbacksRef.current = { onPickLocation, onSelectReport, onSelectWard };

  // Initialize Leaflet map instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    });

    if (interactive) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = group;

    // Fix sizing when mounted inside modals / animated containers
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layerGroupRef.current = null;
      pickerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update free basemap tiles when basemap / darkMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const def = BASEMAPS[basemap ?? defaultBasemap(darkMode)];
    const layer = L.tileLayer(def.tileUrl, {
      attribution: def.attribution,
      subdomains: def.subdomains,
      maxZoom: def.maxZoom,
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [basemap, darkMode]);

  // Smoothly fly when centerLat / centerLng / zoom prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([centerLat, centerLng], zoom, { duration: 0.7 });
  }, [centerLat, centerLng, zoom]);

  // Picker mode: draggable + clickable pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker') return;

    const lat = pickedLat ?? centerLat;
    const lng = pickedLng ?? centerLng;

    if (!pickerMarkerRef.current) {
      const marker = L.marker([lat, lng], {
        draggable: interactive,
        icon: createPinIcon('#0284c7', '+', true),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        callbacksRef.current.onPickLocation?.(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });
      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng([lat, lng]);
    }

    if (!interactive) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const nextLat = Number(e.latlng.lat.toFixed(5));
      const nextLng = Number(e.latlng.lng.toFixed(5));
      pickerMarkerRef.current?.setLatLng([nextLat, nextLng]);
      callbacksRef.current.onPickLocation?.(nextLat, nextLng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [mode, pickedLat, pickedLng, centerLat, centerLng, interactive]);

  // Explorer mode: render Ward circles + Fault pins
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group || mode !== 'explorer') return;
    group.clearLayers();

    wards.forEach((ward) => {
      const circle = L.circle([ward.lat, ward.lng], {
        radius: 1400,
        color: '#38bdf8',
        weight: 1.5,
        opacity: 0.55,
        fillColor: '#0284c7',
        fillOpacity: 0.07,
      });
      circle.on('click', () => callbacksRef.current.onSelectWard?.(ward));
      circle.bindTooltip(`Ward ${ward.wardNumber} · ${ward.suburbs[0]} — tap to activate`, {
        direction: 'top',
      });
      circle.addTo(group);
    });

    reports.forEach((report) => {
      const isSelected = report.id === selectedReportId;
      const color = statusColor(report);
      const pulse =
        !isSelected && (report.isEmergency || report.severity === 'CRITICAL') && report.status !== 'Resolved';

      const marker = L.marker([report.lat, report.lng], {
        icon: createPinIcon(color, String(report.wardNumber), isSelected, pulse),
      });

      marker.on('click', () => callbacksRef.current.onSelectReport?.(report));
      marker.bindTooltip(`${report.id} · ${report.title}`, { direction: 'top' });
      marker.addTo(group);
    });
  }, [mode, reports, wards, selectedReportId]);

  return <div ref={containerRef} className={`${className} z-0`} />;
};
