"use client";

import { useEffect, useRef, useState } from "react";
import type { MapCommunity } from "./actions";

const LEVEL_COLORS: Record<string, string> = {
  global: "#f59e0b",
  continental: "#ef4444",
  national: "#3b82f6",
  state: "#8b5cf6",
  city: "#10b981",
  local: "#06b6d4",
  micro: "#6b7280",
};

const LEVEL_RADIUS: Record<string, number> = {
  global: 20,
  continental: 14,
  national: 10,
  state: 8,
  city: 6,
  local: 5,
  micro: 4,
};

export function CommunityMap({
  communities,
}: {
  communities: MapCommunity[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [selected, setSelected] = useState<MapCommunity | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      // @ts-ignore CSS import handled by Next.js bundler
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      const parentMap = new Map<string, MapCommunity>();
      for (const c of communities) {
        parentMap.set(c.id, c);
      }

      for (const c of communities) {
        if (c.parentId) {
          const parent = parentMap.get(c.parentId);
          if (parent) {
            L.polyline(
              [
                [parent.lat, parent.lng],
                [c.lat, c.lng],
              ],
              {
                color: LEVEL_COLORS[c.level] ?? "#6b7280",
                weight: 1,
                opacity: 0.3,
                dashArray: "4 4",
              }
            ).addTo(map);
          }
        }
      }

      for (const c of communities) {
        const color = LEVEL_COLORS[c.level] ?? "#6b7280";
        const radius = LEVEL_RADIUS[c.level] ?? 6;

        const marker = L.circleMarker([c.lat, c.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        }).addTo(map);

        marker.bindTooltip(
          `<strong>${c.name}</strong><br/>${c.level} · ${c.memberCount} members`,
          { direction: "top", className: "map-tooltip" }
        );

        marker.on("click", () => {
          setSelected(c);
        });
      }

      mapInstance.current = map;
    }

    init();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [communities]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute left-3 top-3 z-[1000] rounded-lg border bg-background/90 px-3 py-2 backdrop-blur-sm">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Hierarchy
        </p>
        <div className="space-y-1">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => {
            const count = communities.filter((c) => c.level === level).length;
            if (count === 0) return null;
            return (
              <div key={level} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{level}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-3 right-3 z-[1000] w-56 rounded-lg border bg-background/90 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {selected.level}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              x
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <p>{selected.memberCount} members</p>
          </div>
        </div>
      )}

      <MapStyles />
    </div>
  );
}

function MapStyles() {
  useEffect(() => {
    const id = "leaflet-map-overrides";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .map-tooltip {
        background: hsl(var(--background)) !important;
        border: 1px solid hsl(var(--border)) !important;
        color: hsl(var(--foreground)) !important;
        border-radius: 6px !important;
        padding: 4px 8px !important;
        font-size: 11px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      }
      .map-tooltip::before {
        border-top-color: hsl(var(--border)) !important;
      }
      .leaflet-container {
        background: hsl(var(--background)) !important;
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
  return null;
}
