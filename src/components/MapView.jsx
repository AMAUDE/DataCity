"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";

// Carte Leaflet pilotée sans react-leaflet pour éviter les soucis de SSR.
export default function MapView({ points = [], polygons = [], height = "100%" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([7.54, -5.55], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const bounds = [];

    for (const poly of polygons) {
      if (!poly.geometry) continue;
      try {
        const layer = L.geoJSON(poly.geometry, {
          style: {
            color: poly.color || "#14b8a6",
            weight: 1.5,
            fillColor: poly.color || "#14b8a6",
            fillOpacity: 0.12,
          },
        });
        layer.bindPopup(
          `<strong>${poly.name}</strong><br/><span style="opacity:.7">${poly.subtitle || ""}</span>`
        );
        layer.addTo(group);
        const b = layer.getBounds();
        if (b.isValid()) bounds.push(b.getNorthEast(), b.getSouthWest());
      } catch {}
    }

    for (const p of points) {
      if (p.latitude == null || p.longitude == null) continue;
      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: 6,
        color: p.color || "#F77F00",
        weight: 2,
        fillColor: p.color || "#F77F00",
        fillOpacity: 0.85,
      });
      const badge = p.verified
        ? '<span style="color:#22c55e">● vérifié</span>'
        : '<span style="color:#eab308">● à vérifier</span>';
      marker.bindPopup(
        `<strong>${p.name}</strong><br/>${p.subtitle || ""}<br/>${badge}`
      );
      marker.addTo(group);
      bounds.push([p.latitude, p.longitude]);
    }

    if (bounds.length) {
      try {
        map.fitBounds(L.latLngBounds(bounds).pad(0.15), { maxZoom: 12 });
      } catch {}
    }
  }, [points, polygons]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
