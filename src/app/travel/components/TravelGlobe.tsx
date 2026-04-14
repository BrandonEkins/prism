'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { format, parseISO } from 'date-fns';
import type { TravelPin } from '../types';
import { STATUS_CONFIG, BUCKET_LIST_COLOR, NPS_COLOR } from '../types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function pinSize(zoom: number, selected: boolean, isChild: boolean): number {
  let base: number;
  if (zoom < 3)       base = isChild ? 10 : 14;
  else if (zoom < 5)  base = isChild ? 13 : 18;
  else if (zoom < 7)  base = isChild ? 16 : 22;
  else if (zoom < 9)  base = isChild ? 19 : 26;
  else                base = isChild ? 22 : 30;
  return selected ? base + 8 : base;
}

function createPinElement(pin: TravelPin, selected: boolean, zoom: number): HTMLElement {
  const isChild = !!pin.parentId;
  const isNP = pin.pinType === 'national_park';
  const isStop = pin.pinType === 'stop';
  const size = pinSize(zoom, selected, isChild);

  // National park child pin: tree badge style
  if (isNP) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position: relative; cursor: pointer; width: ${size}px; height: ${size}px;`;
    const circle = document.createElement('div');
    const fontSize = Math.max(8, Math.round(size * 0.55));
    circle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${NPS_COLOR};
      border: ${selected ? '2px solid white' : '1.5px solid rgba(255,255,255,0.85)'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.3)${selected ? `, 0 0 0 2px ${NPS_COLOR}55` : ''};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      user-select: none;
    `;
    circle.textContent = '🌲';
    wrapper.appendChild(circle);
    wrapper.title = pin.name;
    return wrapper;
  }

  // Stop child pin: smaller purple dot
  if (isStop) {
    const stopColor = pin.color || '#8B5CF6';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position: relative; cursor: pointer; width: ${size}px; height: ${size}px;`;
    const circle = document.createElement('div');
    const fontSize = Math.max(7, Math.round(size * 0.4));
    circle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${stopColor};
      border: ${selected ? '2px solid white' : '1.5px solid rgba(255,255,255,0.85)'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.25)${selected ? `, 0 0 0 2px ${stopColor}55` : ''};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      user-select: none;
      color: white;
      font-weight: bold;
    `;
    circle.textContent = '·';
    wrapper.appendChild(circle);
    wrapper.title = pin.name;
    return wrapper;
  }

  // Root location pin
  const color = pin.color || (pin.isBucketList ? BUCKET_LIST_COLOR : STATUS_CONFIG[pin.status].color);
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position: relative; cursor: pointer; width: ${size}px; height: ${size}px;`;

  const circle = document.createElement('div');
  const fontSize = Math.max(8, Math.round(size * 0.45));
  circle.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background-color: ${color};
    border: ${selected ? '2px solid white' : '1.5px solid rgba(255,255,255,0.85)'};
    box-shadow: 0 2px 6px rgba(0,0,0,0.3)${selected ? `, 0 0 0 2px ${color}55` : ''};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${fontSize}px;
    user-select: none;
    color: white;
    font-weight: bold;
  `;
  circle.textContent = pin.status === 'been_there' ? '✓' : '→';
  wrapper.appendChild(circle);

  // Star badge for bucket list
  if (pin.isBucketList) {
    const badgeSize = Math.max(10, Math.round(size * 0.45));
    const star = document.createElement('div');
    star.style.cssText = `
      position: absolute;
      top: ${-badgeSize / 2}px;
      right: ${-badgeSize / 2}px;
      width: ${badgeSize}px;
      height: ${badgeSize}px;
      background: #F59E0B;
      border-radius: 50%;
      border: 1.5px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(6, badgeSize - 4)}px;
      line-height: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    star.textContent = '⭐';
    wrapper.appendChild(star);
  }

  // Tree badge for national parks (JSONB legacy tags on root pins)
  if (pin.nationalParks && pin.nationalParks.length > 0) {
    const badgeSize = Math.max(10, Math.round(size * 0.45));
    const tree = document.createElement('div');
    const offset = pin.isBucketList ? badgeSize * 0.6 : 0;
    tree.style.cssText = `
      position: absolute;
      top: ${-badgeSize / 2}px;
      left: ${-badgeSize / 2 - offset}px;
      width: ${badgeSize}px;
      height: ${badgeSize}px;
      background: ${NPS_COLOR};
      border-radius: 50%;
      border: 1.5px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(6, badgeSize - 4)}px;
      line-height: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    tree.textContent = '🌲';
    wrapper.appendChild(tree);
  }

  wrapper.title = pin.name;
  return wrapper;
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
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 120px; max-width: 200px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 3px;">🌲 ${pin.name}</div>
        ${dateStr ? `<div style="font-size: 11px; color: #6B7280;">🗓 ${dateStr}</div>` : ''}
        <div style="font-size: 11px; color: #2D6A4F;">National Park</div>
      </div>
    `;
  }

  if (pin.pinType === 'stop') {
    return `
      <div style="font-family: system-ui, sans-serif; min-width: 120px; max-width: 200px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 3px;">📍 ${pin.name}</div>
        ${dateStr ? `<div style="font-size: 11px; color: #6B7280;">🗓 ${dateStr}</div>` : ''}
      </div>
    `;
  }

  return `
    <div style="font-family: system-ui, sans-serif; min-width: 160px; max-width: 240px;">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${pin.name}</div>
      ${pin.tripLabel ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 3px;">📅 ${pin.tripLabel}</div>` : ''}
      ${stops ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 3px;">📍 ${stops}</div>` : ''}
      ${dateStr ? `<div style="font-size: 12px; color: #6B7280; margin-bottom: 3px;">🗓 ${dateStr}</div>` : ''}
      ${parks ? `<div style="font-size: 12px; color: #2D6A4F; margin-bottom: 3px;">🌲 ${parks}</div>` : ''}
      <div style="font-size: 11px; color: #9CA3AF;">${statusLabel}${tags ? ` · ${tags}` : ''}</div>
    </div>
  `;
}

interface TravelGlobeProps {
  pins: TravelPin[];
  selectedPinId: string | null;
  onPinClick: (pin: TravelPin) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function TravelGlobe({ pins, selectedPinId, onPinClick, onMapClick }: TravelGlobeProps) {
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
    if (zoom < 3) return 0;
    if (zoom < 5) return 1;
    if (zoom < 7) return 2;
    if (zoom < 9) return 3;
    return 4;
  }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      zoom: 2,
      center: [0, 20],
      pitchWithRotate: false,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setProjection({ type: 'globe' });
    });

    map.on('zoomend', () => {
      const tier = getZoomTier(map.getZoom());
      setZoomTier((prev) => (prev !== tier ? tier : prev));
    });

    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'travel-pin-popup',
    });

    map.on('click', (e) => {
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever pins, selection, or zoom tier changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom();
    const currentIds = new Set(pins.map((p) => p.id));

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const pin of pins) {
      if (pin.latitude === 0 && pin.longitude === 0) continue;

      const isSelected = pin.id === selectedPinId;
      const existing = markersRef.current.get(pin.id);

      const buildMarker = () => {
        const el = createPinElement(pin, isSelected, zoom);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          popupRef.current?.remove();
          onPinClickRef.current(pin);
        });

        el.addEventListener('mouseenter', () => {
          if (!map) return;
          popupRef.current
            ?.setLngLat([pin.longitude, pin.latitude])
            .setHTML(buildTooltipHTML(pin))
            .addTo(map);
        });

        el.addEventListener('mouseleave', () => {
          popupRef.current?.remove();
        });

        return el;
      };

      if (existing) {
        existing.remove();
        markersRef.current.delete(pin.id);
      }
      const marker = new maplibregl.Marker({ element: buildMarker() })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      markersRef.current.set(pin.id, marker);
    }
  }, [pins, selectedPinId, zoomTier]);

  // Fly to selected pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPinId) return;
    const pin = pins.find((p) => p.id === selectedPinId);
    if (!pin || (pin.latitude === 0 && pin.longitude === 0)) return;
    map.flyTo({
      center: [pin.longitude, pin.latitude],
      zoom: Math.max(map.getZoom(), 4),
      duration: 800,
      essential: true,
    });
  }, [selectedPinId, pins]);

  return (
    <>
      <style>{`
        .travel-pin-popup .maplibregl-popup-content {
          padding: 10px 12px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .travel-pin-popup .maplibregl-popup-tip {
          border-top-color: white;
        }
      `}</style>
      <div ref={containerRef} className="flex-1 rounded-lg overflow-hidden" />
    </>
  );
}
