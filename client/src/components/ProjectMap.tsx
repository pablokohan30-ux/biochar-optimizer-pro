import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Vite/ESM bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type ProjectMapProps = {
  latitude: number | null;
  longitude: number | null;
  zoom?: number;
  label?: string;
  className?: string;
};

export default function ProjectMap({
  latitude,
  longitude,
  zoom = 10,
  label,
  className = "",
}: ProjectMapProps) {
  // Default to Buenos Aires if no coords (just a reasonable default)
  const hasCoords = latitude !== null && longitude !== null;
  const center: [number, number] = hasCoords
    ? [latitude!, longitude!]
    : [-34.6037, -58.3816];

  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={hasCoords ? zoom : 3}
        style={{ height: "100%", width: "100%", minHeight: "300px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasCoords && (
          <Marker position={center}>
            {label && <Popup>{label}</Popup>}
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
