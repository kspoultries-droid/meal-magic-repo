import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { lat: number; lng: number };
export default function DeliveryMap({ destination, rider }: { destination: Point | null; rider: Point | null }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);
  const destinationMarker = useRef<L.Marker | null>(null);
  const initialFit = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([28.42, 70.3], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; riderMarker.current = null; destinationMarker.current = null; initialFit.current = false; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const marker = (point: Point | null, ref: React.MutableRefObject<L.Marker | null>, type: "rider" | "destination", label: string) => {
      if (!point) { ref.current?.remove(); ref.current = null; return; }
      if (ref.current) ref.current.setLatLng([point.lat, point.lng]);
      else ref.current = L.marker([point.lat, point.lng], {
        icon: L.divIcon({ className: `delivery-map-marker delivery-map-marker--${type}`, html: type === "rider" ? "🏍" : "📍", iconSize: [36, 36], iconAnchor: [18, 18] }),
      }).addTo(instance).bindTooltip(label);
    };
    marker(destination, destinationMarker, "destination", "ڈیلیوری کا پتہ / Delivery address");
    marker(rider, riderMarker, "rider", "رائیڈر کا تازہ مقام / Rider GPS");
    const points = [destination, rider].filter((p): p is Point => p !== null);
    if (points.length && (!initialFit.current || (rider && !instance.getBounds().contains([rider.lat, rider.lng])))) {
      instance.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
      initialFit.current = true;
    }
  }, [destination?.lat, destination?.lng, rider?.lat, rider?.lng]);

  return <div ref={container} className="h-full w-full relative z-0" aria-label="ڈیلیوری اور رائیڈر کا نقشہ" />;
}