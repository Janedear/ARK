import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import OfflineTileLayer from '@/components/map/OfflineTileLayer';
import { CATEGORY_COLORS, escapeHtml, hasCoords } from '@/components/map/mapConfig';

const VIEW_KEY = 'ark-map-view-v1';

function popupHtml(listing) {
  const lines = [`<b>${escapeHtml(listing.name)}</b>`];
  const subtitle = [listing.category, listing.area].filter(Boolean).join(' · ');
  if (subtitle) lines.push(escapeHtml(subtitle));
  if (listing.address) lines.push(escapeHtml(listing.address));
  if (listing.access_notes) lines.push(escapeHtml(listing.access_notes));
  lines.push(`Checked: ${escapeHtml(listing.last_verified || 'unknown')} · ${escapeHtml(listing.status || 'unverified')}`);
  return lines.join('<br>');
}

export default function MapCanvas({ listings, focus, onViewChange, onMissingTile }) {
  const holder = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const callbacks = useRef({ onViewChange, onMissingTile });
  callbacks.current = { onViewChange, onMissingTile };

  useEffect(() => {
    if (mapRef.current || !holder.current) return;
    let start = { lat: 39.5, lng: -98.35, zoom: 4 };
    try {
      start = { ...start, ...JSON.parse(localStorage.getItem(VIEW_KEY) || '{}') };
    } catch { /* first visit */ }

    const map = L.map(holder.current, {
      center: [start.lat, start.lng],
      zoom: start.zoom,
      worldCopyJump: true,
    });

    const tiles = new OfflineTileLayer({
      minZoom: 2,
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });
    tiles.on('tilesource', event => {
      if (event.source === 'missing') callbacks.current.onMissingTile?.();
    });
    tiles.addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    map.on('moveend', () => {
      const center = map.getCenter();
      const next = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
      localStorage.setItem(VIEW_KEY, JSON.stringify(next));
      callbacks.current.onViewChange?.(next);
    });

    mapRef.current = map;
    callbacks.current.onViewChange?.({ lat: start.lat, lng: start.lng, zoom: start.zoom });

    const resize = setTimeout(() => map.invalidateSize(), 160);
    return () => {
      clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    (listings || []).filter(hasCoords).forEach(listing => {
      const color = CATEGORY_COLORS[listing.category] || '#4a5560';
      L.circleMarker([listing.latitude, listing.longitude], {
        radius: 8,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
      }).bindPopup(popupHtml(listing)).addTo(markersRef.current);
    });
  }, [listings]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.setView([focus.lat, focus.lng], focus.zoom ?? mapRef.current.getZoom());
  }, [focus]);

  return <div ref={holder} className="ark-map" role="application" aria-label="Map of saved areas and resource listings" />;
}