import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CivicReport, WardRecord } from '../types/civic';

interface InteractiveMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  darkMode: boolean;
  mode: 'picker' | 'explorer';
  className?: string;
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

function createPinIcon(color: string, label: string, selected = false) {
  const size = selected ? 34 : 26;
  const ring = selected ? `<circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" />` : '';
  return L.divIcon({
    className: 'civic-map-pin',
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${ring}
        <circle cx="16" cy="16" r="9" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <text x="16" y="19.5" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="700" font-family="monospace">${label}</text>
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
  mode,
  className = 'h-64 w-full',
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

  // Initialize Leaflet map instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layerGroupRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, []);

  // Update tile basemap when darkMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const layer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [darkMode]);

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
        draggable: true,
        icon: createPinIcon('#0284c7', '+', true),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPickLocation?.(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });
      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng([lat, lng]);
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      const nextLat = Number(e.latlng.lat.toFixed(5));
      const nextLng = Number(e.latlng.lng.toFixed(5));
      pickerMarkerRef.current?.setLatLng([nextLat, nextLng]);
      onPickLocation?.(nextLat, nextLng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [mode, pickedLat, pickedLng, centerLat, centerLng, onPickLocation]);

  // Explorer mode: render Ward circles + Fault pins
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group || mode !== 'explorer') return;
    group.clearLayers();

    wards.forEach((ward) => {
      const circle = L.circle([ward.lat, ward.lng], {
        radius: 1400,
        color: '#38bdf8',
        weight: 1,
        opacity: 0.4,
        fillColor: '#0284c7',
        fillOpacity: 0.06,
      });
      circle.on('click', () => onSelectWard?.(ward));
      circle.bindTooltip(`Ward ${ward.wardNumber} · ${ward.suburbs[0]}`, {
        direction: 'top',
      });
      circle.addTo(group);
    });

    reports.forEach((report) => {
      const isSelected = report.id === selectedReportId;
      const color =
        report.forensics.status === 'FLAGGED_SYNTHETIC'
          ? '#dc2626'
          : report.status === 'Resolved'
            ? '#059669'
            : report.isEmergency || report.severity === 'CRITICAL'
              ? '#ea580c'
              : '#0284c7';

      const marker = L.marker([report.lat, report.lng], {
        icon: createPinIcon(color, String(report.wardNumber), isSelected),
      });

      marker.on('click', () => onSelectReport?.(report));
      marker.bindTooltip(`${report.id} · ${report.title}`, { direction: 'top' });
      marker.addTo(group);
    });
  }, [mode, reports, wards, selectedReportId, onSelectReport, onSelectWard]);

  return <div ref={containerRef} className={`${className} z-0`} />;
};
