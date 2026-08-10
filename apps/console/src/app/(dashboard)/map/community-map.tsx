"use client";

import { useEffect, useRef, useState } from "react";
import type { MapCommunity } from "./actions";

/**
 * Session 7 (web scaffold) — replaced 7 unrelated saturated hues with a
 * single-hue intensity ramp along the brand accent gradient, per
 * DESIGN.web.md's data-viz rule ("do not invent a second saturated hue")
 * and the exact spec in sessions/web-brand-output.md §5 "Map". Hierarchy
 * depth is now encoded by intensity (colour + opacity), not by which of
 * 7 unrelated colours a level happens to get — LEVEL_RADIUS (size) is
 * unchanged, it already encoded depth correctly and isn't a colour
 * decision.
 *
 * --accent-start / --accent-end below are the same values as
 * packages/ui/theme.css §6 — duplicated as plain JS constants because
 * Leaflet draws to canvas/SVG directly and can't read a CSS custom
 * property. Same pattern already used by each app's lib/power-tree.ts
 * for tier colours (see DESIGN.web.md's own note on that file being the
 * source of truth despite the duplication).
 */
const ACCENT_END = { r: 0x8b, g: 0x5c, b: 0xf6 }; // --accent-end, global (root)
const ACCENT_START = { r: 0x4f, g: 0x6b, b: 0xff }; // --accent-start, micro (leaf)
const TEXT_SECONDARY = "#9297ad"; // --color-text-secondary — edges are structure, not data
const ACCENT_GLOW_RING = "rgba(124, 109, 255, 0.9)"; // --accent-glow colour, selected-node ring

const LEVEL_ORDER = [
  "global",
  "continental",
  "national",
  "state",
  "city",
  "local",
  "micro",
] as const;

function mixAccent(t: number): string {
  const r = Math.round(ACCENT_END.r + (ACCENT_START.r - ACCENT_END.r) * t);
  const g = Math.round(ACCENT_END.g + (ACCENT_START.g - ACCENT_END.g) * t);
  const b = Math.round(ACCENT_END.b + (ACCENT_START.b - ACCENT_END.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const LEVEL_COLORS: Record<string, string> = {};
const LEVEL_OPACITY: Record<string, number> = {};
LEVEL_ORDER.forEach((level, i) => {
  const t = i / (LEVEL_ORDER.length - 1);
  LEVEL_COLORS[level] = mixAccent(t);
  LEVEL_OPACITY[level] = 1 - t * 0.45; // 100% (global) easing to 55% (micro)
});

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
            // Edges are structure, not data — flat text-secondary, not a
            // per-level colour (session 7, web-brand-output.md §5).
            L.polyline(
              [
                [parent.lat, parent.lng],
                [c.lat, c.lng],
              ],
              {
                color: TEXT_SECONDARY,
                weight: 1,
                opacity: 0.25,
                dashArray: "4 4",
              }
            ).addTo(map);
          }
        }
      }

      function ringFor(c: MapCommunity) {
        const color = LEVEL_COLORS[c.level] ?? ACCENT_GLOW_RING;
        const opacity = LEVEL_OPACITY[c.level] ?? 0.7;
        const radius = LEVEL_RADIUS[c.level] ?? 6;
        return { color, opacity, radius };
      }

      const markersById = new Map<string, L.CircleMarker>();
      let selectedId: string | null = null;

      for (const c of communities) {
        const { color, opacity, radius } = ringFor(c);

        const marker = L.circleMarker([c.lat, c.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity,
          fillOpacity: opacity * 0.5,
        }).addTo(map);

        markersById.set(c.id, marker);

        marker.bindTooltip(
          `<strong>${c.name}</strong><br/>${c.level} · ${c.memberCount} members`,
          { direction: "top", className: "map-tooltip" }
        );

        marker.on("click", () => {
          // Selected node: ring using --accent-glow, not a fill colour
          // change (session 7, web-brand-output.md §5).
          if (selectedId && selectedId !== c.id) {
            const prevMarker = markersById.get(selectedId);
            const prevCommunity = parentMap.get(selectedId);
            if (prevMarker && prevCommunity) {
              prevMarker.setStyle({ color: ringFor(prevCommunity).color, weight: 2 });
            }
          }
          marker.setStyle({ color: ACCENT_GLOW_RING, weight: 4 });
          selectedId = c.id;
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
