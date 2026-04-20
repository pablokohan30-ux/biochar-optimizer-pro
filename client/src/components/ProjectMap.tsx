import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon, Satellite } from "lucide-react";

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
  /** Default layer: "street" or "satellite". Defaults to "satellite" — carbon projects
   *  are typically in rural/agricultural areas where satellite imagery is more useful
   *  than road networks. */
  defaultLayer?: "street" | "satellite";
};

export default function ProjectMap({
  latitude,
  longitude,
  zoom = 10,
  label,
  className = "",
  defaultLayer = "satellite",
}: ProjectMapProps) {
  const [activeLayer, setActiveLayer] = useState<"street" | "satellite">(defaultLayer);

  // Default to Buenos Aires if no coords (just a reasonable default)
  const hasCoords = latitude !== null && longitude !== null;
  const center: [number, number] = hasCoords
    ? [latitude!, longitude!]
    : [-34.6037, -58.3816];

  return (
    <div className={`rounded-lg overflow-hidden border border-border relative ${className}`}>
      <MapContainer
        center={center}
        zoom={hasCoords ? zoom : 3}
        style={{ height: "100%", width: "100%", minHeight: "300px" }}
        scrollWheelZoom={false}
      >
        {activeLayer === "street" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : (
          <>
            {/* Esri World Imagery — free, no API key, high-res satellite */}
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            {/* Overlay thin labels so you still know where you are */}
            <TileLayer
              url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png"
              attribution=""
              opacity={0.85}
              maxZoom={19}
            />
          </>
        )}
        {hasCoords && (
          <Marker position={center}>
            {label && <Popup>{label}</Popup>}
          </Marker>
        )}
      </MapContainer>

      {/* Layer toggle — bottom-right, over the map */}
      <div className="absolute bottom-3 right-3 z-[400] flex gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-0.5 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveLayer("satellite")}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            activeLayer === "satellite"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Satellite view"
        >
          <Satellite className="w-3 h-3" />
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("street")}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            activeLayer === "street"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Street view"
        >
          <MapIcon className="w-3 h-3" />
          <span>Map</span>
        </button>
      </div>
    </div>
  );
}
