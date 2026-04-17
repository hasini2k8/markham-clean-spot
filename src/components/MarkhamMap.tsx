import { useEffect, useRef } from "react";
import L from "leaflet";
import { MARKHAM_BOUNDS, MARKHAM_CENTER } from "@/lib/markham";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  status: "in_progress" | "pending_review" | "approved" | "rejected";
  label?: string;
}

interface Props {
  pins?: MapPin[];
  onPickLocation?: (lat: number, lng: number) => void;
  pickedLocation?: { lat: number; lng: number } | null;
  height?: string;
}

export function MarkhamMap({ pins = [], onPickLocation, pickedLocation, height = "500px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: MARKHAM_CENTER,
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: MARKHAM_BOUNDS,
      maxBoundsViscosity: 1.0,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      bounds: MARKHAM_BOUNDS,
    }).addTo(map);

    // Draw boundary
    L.rectangle(MARKHAM_BOUNDS, {
      color: "#4a6741",
      weight: 2,
      fillOpacity: 0,
      dashArray: "6 6",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (onPickLocation) {
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        if (lat >= 43.8 && lat <= 43.92 && lng >= -79.4 && lng <= -79.21) {
          onPickLocation(lat, lng);
        }
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render pins
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    pins.forEach((p) => {
      const cls =
        p.status === "approved" ? "cleanup-pin-approved"
        : p.status === "rejected" ? "cleanup-pin-rejected"
        : p.status === "pending_review" ? "cleanup-pin-pending"
        : "cleanup-pin-progress";
      const icon = L.divIcon({
        className: "",
        html: `<div class="cleanup-pin ${cls}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      if (p.label) m.bindPopup(p.label);
    });
    if (pickedLocation) {
      const icon = L.divIcon({
        className: "",
        html: `<div class="cleanup-pin" style="background: oklch(0.62 0.16 40)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker([pickedLocation.lat, pickedLocation.lng], { icon }).addTo(layer);
    }
  }, [pins, pickedLocation]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-soft)]" />;
}
