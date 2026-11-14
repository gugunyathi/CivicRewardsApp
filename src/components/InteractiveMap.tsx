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
  basemap?: BasemapId;
  mode: 'picker' | 'explorer';
  className?: string;
  interactive?: boolean;
  pickedLat?: number;
  pickedLng?: number;
  onPickLocation?: (lat: number, lng: number) => void;
  reports?: CivicReport[];
  wards?: WardRecord[];
  selectedReportId?: string | null;
  onSelectReport?: (report: CivicReport) => void;
  onSelectWard?: (ward: WardRecord) => void;
  onClearSelection?: () => void;
}

// Ward 115 (CoJ) boundary covering Fourways, Cedar Rd, Craigavon, Douglasdale & Bloubosrand
const WARD_115_POLYGON: Array<[number, number]> = [
  [-26.0045, 27.9920],
  [-26.0058, 28.0125],
  [-26.0145, 28.0265],
  [-26.0285, 28.0278],
  [-26.0415, 28.0155],
  [-26.0432, 27.9945],
  [-26.0345, 27.9815],
  [-26.0175, 27.9835],
];

export function getReportPinColor(report: CivicReport): string {
  if (report.status === 'Resolved') return '#10b981'; // Green
  if (report.status === 'Escalated to Depot' || report.status === 'Technician Dispatched') {
    return '#f97316'; // Orange
  }
  return '#ef4444'; // Red (Logged / Pending / Blocked)
}

function createPinIcon(color: string, label: string, selected = false, pulse = false) {
  const size = selected ? 32 : 20;
  const ring = selected
    ? `<circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.24" stroke="${color}" stroke-width="2" />`
    : '';
  const innerRadius = selected ? 9 : 6.5;
  const labelText = selected
    ? `<text x="16" y="19" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="800" font-family="ui-monospace, monospace">${label}</text>`
    : '';
  return L.divIcon({
    className: `civic-map-pin${pulse ? ' civic-map-pin-pulse' : ''}`,
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.45));">
      <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${ring}
        <circle cx="16" cy="16" r="${innerRadius}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        ${labelText}
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const InteractiveMap: React.FC<InteractiveMapProps> = React.memo(({
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
  onClearSelection,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const prevFocusRef = useRef<{ lat: number; lng: number; zoom: number }>({
    lat: centerLat,
    lng: centerLng,
    zoom,
  });
  const callbacksRef = useRef({ onPickLocation, onSelectReport, onSelectWard, onClearSelection });
  callbacksRef.current = { onPickLocation, onSelectReport, onSelectWard, onClearSelection };

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

    if (mode === 'explorer') {
      map.on('click', () => {
        callbacksRef.current.onClearSelection?.();
      });
    }

    mapRef.current = map;
    layerGroupRef.current = group;

    const t1 = window.setTimeout(() => map.invalidateSize(), 100);
    const t2 = window.setTimeout(() => map.invalidateSize(), 420);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = prevFocusRef.current;
    if (prev.lat === centerLat && prev.lng === centerLng && prev.zoom === zoom) return;
    prevFocusRef.current = { lat: centerLat, lng: centerLng, zoom };
    map.flyTo([centerLat, centerLng], zoom, { duration: 0.55 });
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker') return;

    const lat = pickedLat ?? centerLat;
    const lng = pickedLng ?? centerLng;

    if (!pickerMarkerRef.current) {
      const marker = L.marker([lat, lng], {
        draggable: interactive,
        icon: createPinIcon('#10b981', '+', true),
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

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group || mode !== 'explorer') return;
    group.clearLayers();

    wards.forEach((ward) => {
      const shape =
        ward.id === 'CoJ-115'
          ? L.polygon(WARD_115_POLYGON, {
              color: '#10b981',
              weight: 2,
              opacity: 0.75,
              dashArray: '5 4',
              fillColor: '#059669',
              fillOpacity: 0.07,
            })
          : L.circle([ward.lat, ward.lng], {
              radius: 1400,
              color: '#10b981',
              weight: 1.5,
              opacity: 0.5,
              fillColor: '#059669',
              fillOpacity: 0.05,
            });

      shape.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        callbacksRef.current.onSelectWard?.(ward);
      });
      shape.bindTooltip(`Ward ${ward.wardNumber} · ${ward.suburbs[0]}`, {
        direction: 'top',
      });
      shape.addTo(group);
    });

    reports.forEach((report) => {
      const isSelected = report.id === selectedReportId;
      const color = getReportPinColor(report);
      const pulse = !isSelected && report.status !== 'Resolved' && (report.isEmergency || report.severity === 'CRITICAL');

      const marker = L.marker([report.lat, report.lng], {
        icon: createPinIcon(color, String(report.wardNumber), isSelected, pulse),
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        callbacksRef.current.onSelectReport?.(report);
      });
      marker.bindTooltip(`${report.status} · ${report.title}`, { direction: 'top' });
      marker.addTo(group);
    });
  }, [mode, reports, wards, selectedReportId]);

  return <div ref={containerRef} className={`${className} z-0`} />;
});
