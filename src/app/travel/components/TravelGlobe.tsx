'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { format, parseISO } from 'date-fns';
import type { TravelPin } from '../types';
import { STATUS_CONFIG, BUCKET_LIST_COLOR, NPS_COLOR } from '../types';

const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';

function pinSize(zoom: number, selected: boolean, isChild: boolean): number {
  let base: number;
  if (zoom < 3)       base = isChild ? 10 : 14;
  else if (zoom < 5)  base = isChild ? 13 : 18;
  else if (zoom < 7)  base = isChild ? 16 : 22;
  else if (zoom < 9)  base = isChild ? 19 : 26;
  else                base = isChild ? 22 : 30;
  return selected ? base + 8 : base;
}

// Classic teardrop/drop-pin SVG — tip anchored at bottom-center
function createDropPin(color: string, selected: boolean, size: number, icon?: string): HTMLElement {
  const h = Math.round(size * 1.4);
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `cursor: pointer; width: ${size}px; height: ${h}px; position: relative;`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', `${size}`);
  svg.setAttribute('height', `${h}`);
  svg.setAttribute('viewBox', '0 0 24 34');
  svg.style.cssText = `display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,${selected ? '0.45' : '0.3'}));`;

  // Pin body path: circle top, pointed bottom
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute('d', 'M12 1C6.2 1 1.5 5.7 1.5 11.5c0 8.2 10.5 21 10.5 21s10.5-12.8 10.5-21C22.5 5.7 17.8 1 12 1z');
  body.setAttribute('fill', color);
  body.setAttribute('stroke', selected ? 'white' : 'rgba(255,255,255,0.85)');
  body.setAttribute('stroke-width', selected ? '2' : '1.5');
  svg.appendChild(body);

  // Ring glow when selected
  if (selected) {
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', 'M12 1C6.2 1 1.5 5.7 1.5 11.5c0 8.2 10.5 21 10.5 21s10.5-12.8 10.5-21C22.5 5.7 17.8 1 12 1z');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('stroke', color);
    glow.setAttribute('stroke-width', '3');
    glow.setAttribute('stroke-opacity', '0.35');
    glow.setAttribute('transform', 'scale(1.18) translate(-1.8, -1.3)');
    svg.insertBefore(glow, body);
  }

  // Icon inside circle (centered around y=11.5)
  if (icon) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '12');
    text.setAttribute('y', '16');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', `${Math.round(size * 0.45)}`);
    text.setAttribute('font-family', 'system-ui, sans-serif');
    text.setAttribute('font-weight', 'bold');
    text.textContent = icon;
    svg.appendChild(text);
  } else {
    // White dot for "want to go"
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '12');
    dot.setAttribute('cy', '11');
    dot.setAttribute('r', `${Math.round(size * 0.18)}`);
    dot.setAttribute('fill', 'rgba(255,255,255,0.75)');
    svg.appendChild(dot);
  }

  wrapper.appendChild(svg);
  return wrapper;
}

function createPinElement(pin: TravelPin, selected: boolean, zoom: number): { el: HTMLElement; anchor: maplibregl.PositionAnchor } {
  const isChild = !!pin.parentId;
  const isNP = pin.pinType === 'national_park';
  const isStop = pin.pinType === 'stop';
  const size = pinSize(zoom, selected, isChild);

  // National park child pin: green circle with tree
  if (isNP) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `cursor: pointer; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${NPS_COLOR}; border: ${selected ? '2px solid white' : '1.5px solid rgba(255,255,255,0.85)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: ${Math.max(8, Math.round(size * 0.55))}px; user-select: none;`;
    wrapper.textContent = '🌲';
    wrapper.title = pin.name;
    return { el: wrapper, anchor: 'center' };
  }

  // Stop child pin: purple circle
  if (isStop) {
    const stopColor = pin.color || '#8B5CF6';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `cursor: pointer; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${stopColor}; border: ${selected ? '2px solid white' : '1.5px solid rgba(255,255,255,0.85)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; user-select: none;`;
    wrapper.title = pin.name;
    return { el: wrapper, anchor: 'center' };
  }

  // Root location pin: drop pin shape
  const color = pin.color || (pin.isBucketList ? BUCKET_LIST_COLOR : STATUS_CONFIG[pin.status].color);
  const icon = pin.status === 'been_there' ? '✓' : undefined;
  const wrapper = createDropPin(color, selected, size, icon);
  wrapper.title = pin.name;

  const h = Math.round(size * 1.4);
  const badgeSize = Math.max(10, Math.round(size * 0.42));

  // Star badge (bucket list) — top-right of pin
  if (pin.isBucketList) {
    const star = document.createElement('div');
    star.style.cssText = `position: absolute; top: ${-badgeSize / 3}px; right: ${-badgeSize / 3}px; width: ${badgeSize}px; height: ${badgeSize}px; background: #F59E0B; border-radius: 50%; border: 1.5px solid white; display: flex; align-items: center; justify-content: center; font-size: ${Math.max(6, badgeSize - 5)}px; line-height: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 1;`;
    star.textContent = '⭐';
    wrapper.appendChild(star);
  }

  // NPS badge (legacy tags) — top-left of pin
  if (pin.nationalParks && pin.nationalParks.length > 0) {
    const offset = pin.isBucketList ? badgeSize * 0.6 : 0;
    const tree = document.createElement('div');
    tree.style.cssText = `position: absolute; top: ${-badgeSize / 3}px; left: ${-badgeSize / 3 - offset}px; width: ${badgeSize}px; height: ${badgeSize}px; background: ${NPS_COLOR}; border-radius: 50%; border: 1.5px solid white; display: flex; align-items: center; justify-content: center; font-size: ${Math.max(6, badgeSize - 5)}px; line-height: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 1;`;
    tree.textContent = '🌲';
    wrapper.appendChild(tree);
  }

  // Offset wrapper so tip anchors at coordinate (anchor: 'bottom' aligns bottom-center)
  // Pin tip is at bottom-center of the SVG; we want that to be the anchor point.
  // MapLibre 'bottom' anchor aligns element bottom-center to the coordinate.
  wrapper.style.marginBottom = `0px`; // tip is already at element bottom

  void h; // used for future badge positioning reference
  return { el: wrapper, anchor: 'bottom' };
}

function buildTooltipHTML(pin: TravelPin): string {
  const statusLabel = pin.isBucketList ? '⭐ Bucket List' : STATUS_CONFIG[pin.status].label;
  let dateStr = '';
  if (pin.visitedDate) {
    const start = format(parseISO(pin.visitedDate), 'MMM d, yyyy');
    const end = pin.visitedEndDate ? ` – ${format(parseISO(pin.visitedEndDate), 'MMM d, yyyy')}` : '';
    dateStr = `${start}${end}`;
  }
  const tags = (pin.tags || []).slice(0, 3).join(' · ');
  const parks = (pin.nationalParks || []).slice(0, 2).join(', ');
  const stops = (pin.stops || []).slice(0, 3).join(' · ');

  if (pin.pinType === 'national_park') {
    return `<div style="font-family:system-ui,sans-serif;min-width:120px;max-width:200px"><div style="font-weight:600;font-size:13px;margin-bottom:3px">🌲 ${pin.name}</div>${dateStr ? `<div style="font-size:11px;color:#6B7280">🗓 ${dateStr}</div>` : ''}<div style="font-size:11px;color:#2D6A4F">National Park</div></div>`;
  }
  if (pin.pinType === 'stop') {
    return `<div style="font-family:system-ui,sans-serif;min-width:120px;max-width:200px"><div style="font-weight:600;font-size:13px;margin-bottom:3px">📍 ${pin.name}</div>${dateStr ? `<div style="font-size:11px;color:#6B7280">🗓 ${dateStr}</div>` : ''}</div>`;
  }
  return `<div style="font-family:system-ui,sans-serif;min-width:160px;max-width:240px"><div style="font-weight:600;font-size:14px;margin-bottom:4px">${pin.name}</div>${pin.tripLabel ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px">📅 ${pin.tripLabel}</div>` : ''}${stops ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px">📍 ${stops}</div>` : ''}${dateStr ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px">🗓 ${dateStr}</div>` : ''}${parks ? `<div style="font-size:12px;color:#2D6A4F;margin-bottom:3px">🌲 ${parks}</div>` : ''}<div style="font-size:11px;color:#9CA3AF">${statusLabel}${tags ? ` · ${tags}` : ''}</div></div>`;
}

function addTripLinesLayer(map: maplibregl.Map) {
  if (map.getSource('trip-lines')) return;
  map.addSource('trip-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'trip-lines', type: 'line', source: 'trip-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': [3, 2] },
  });
}

interface TravelGlobeProps {
  pins: TravelPin[];
  selectedPinId: string | null;
  darkMode: boolean;
  onPinClick: (pin: TravelPin) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function TravelGlobe({ pins, selectedPinId, darkMode, onPinClick, onMapClick }: TravelGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const onMapClickRef = useRef(onMapClick);
  const pinsRef = useRef(pins);
  const [zoomTier, setZoomTier] = useState(0);

  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { pinsRef.current = pins; }, [pins]);

  function getZoomTier(zoom: number): number {
    if (zoom < 3) return 0; if (zoom < 5) return 1;
    if (zoom < 7) return 2; if (zoom < 9) return 3; return 4;
  }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_LIGHT,
      zoom: 2, center: [0, 20], pitchWithRotate: false, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // Re-add trip lines layer on every style load (initial + dark/light switch)
    map.on('style.load', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setProjection({ type: 'globe' });
      addTripLinesLayer(map);
    });

    map.on('zoomend', () => {
      const tier = getZoomTier(map.getZoom());
      setZoomTier((prev) => (prev !== tier ? tier : prev));
    });

    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'travel-pin-popup' });
    map.on('click', (e) => { onMapClickRef.current(e.lngLat.lat, e.lngLat.lng); });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    const currentIds = new Set(pins.map((p) => p.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    }
    for (const pin of pins) {
      if (pin.latitude === 0 && pin.longitude === 0) continue;
      const isSelected = pin.id === selectedPinId;
      const existing = markersRef.current.get(pin.id);

      const buildMarker = () => {
        const { el, anchor } = createPinElement(pin, isSelected, zoom);
        el.addEventListener('click', (e) => { e.stopPropagation(); popupRef.current?.remove(); onPinClickRef.current(pin); });
        el.addEventListener('mouseenter', () => {
          if (!map) return;
          popupRef.current?.setLngLat([pin.longitude, pin.latitude]).setHTML(buildTooltipHTML(pin)).addTo(map);
        });
        el.addEventListener('mouseleave', () => { popupRef.current?.remove(); });
        return { el, anchor };
      };

      if (existing) { existing.remove(); markersRef.current.delete(pin.id); }
      const { el, anchor } = buildMarker();
      const marker = new maplibregl.Marker({ element: el, anchor })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      markersRef.current.set(pin.id, marker);
    }
  }, [pins, selectedPinId, zoomTier]);

  // Trip lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('trip-lines') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const parent = selectedPinId ? pins.find((p) => p.id === selectedPinId) : null;
    if (!parent || (parent.latitude === 0 && parent.longitude === 0)) {
      source.setData({ type: 'FeatureCollection', features: [] }); return;
    }
    const children = pins.filter((p) => p.parentId === selectedPinId && (p.latitude !== 0 || p.longitude !== 0));
    source.setData({
      type: 'FeatureCollection',
      features: children.map((c) => ({
        type: 'Feature' as const,
        properties: { color: c.pinType === 'national_park' ? NPS_COLOR : '#8B5CF6' },
        geometry: { type: 'LineString' as const, coordinates: [[parent.longitude, parent.latitude], [c.longitude, c.latitude]] },
      })),
    });
  }, [pins, selectedPinId]);

  // Fly to selected pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPinId) return;
    const pin = pins.find((p) => p.id === selectedPinId);
    if (!pin || (pin.latitude === 0 && pin.longitude === 0)) return;
    map.flyTo({ center: [pin.longitude, pin.latitude], zoom: Math.max(map.getZoom(), 4), duration: 800, essential: true });
  }, [selectedPinId, pins]);

  return (
    <>
      <style>{`
        .travel-pin-popup .maplibregl-popup-content { padding: 10px 12px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.08); }
        .travel-pin-popup .maplibregl-popup-tip { border-top-color: white; }
        .globe-dark .maplibregl-canvas-container { filter: brightness(0.72) saturate(0.55) contrast(1.08) hue-rotate(5deg); }
      `}</style>
      <div ref={containerRef} className={`flex-1 rounded-lg overflow-hidden${darkMode ? ' globe-dark' : ''}`} />
    </>
  );
}
