"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const JAKARTA: [number, number] = [-6.2088, 106.8456];

function VoltaPin() {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#C07A24;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></span>`,
  });
}

// Browser-only: dimuat via next/dynamic ssr:false dari iface.tsx.
export default function LeafletMap({ className = "h-56 w-full" }: { className?: string }) {
  return (
    <MapContainer
      center={JAKARTA}
      zoom={13}
      scrollWheelZoom={false}
      className={className}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={JAKARTA} icon={VoltaPin()}>
        <Popup>ESP32-01 · −6.2088, 106.8456</Popup>
      </Marker>
    </MapContainer>
  );
}
