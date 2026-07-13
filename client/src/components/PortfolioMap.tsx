import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet marker icons work with Vite bundling — same fix used by ProjectMap.
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

export interface PortfolioMapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  name: string;
  country?: string | null;
  capacityTnYear?: number | null;
  status?: string | null;
  linkHref?: string;
}

interface Props {
  markers: PortfolioMapMarker[];
  className?: string;
}

/**
 * Multi-marker map for the Portfolio dashboard. Auto-fits bounds to the
 * markers on first render (and when the marker set changes), and includes
 * a popup with the site name + link to the underlying page.
 *
 * Only renders sites that actually have lat/lon — callers filter first.
 */
export default function PortfolioMap({ markers, className = "" }: Props) {
  const center: [number, number] = markers.length > 0
    ? [markers[0].latitude, markers[0].longitude]
    : [-15, -55]; // South America default when no coords available

  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={3}
        style={{ height: "100%", width: "100%", minHeight: "360px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png"
          attribution=""
          opacity={0.85}
          maxZoom={19}
        />
        <FitToMarkers markers={markers} />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.latitude, m.longitude]}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold mb-1">{m.name}</div>
                {m.country && <div>{m.country}</div>}
                {m.capacityTnYear != null && (
                  <div>{m.capacityTnYear.toLocaleString()} tn/año</div>
                )}
                {m.status && <div className="capitalize">{m.status}</div>}
                {m.linkHref && (
                  <a
                    href={m.linkHref}
                    className="mt-2 inline-block text-indigo-600 hover:underline"
                  >
                    Abrir →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

/** Fits the map view to include every marker; re-runs when the marker set
 *  changes (adding a site, applying a filter, etc.). No-op if there are no
 *  markers so we don't crash Leaflet's LatLngBounds constructor. */
function FitToMarkers({ markers }: { markers: PortfolioMapMarker[] }) {
  const map = useMap();
  const previousKeyRef = useRef<string>("");

  useEffect(() => {
    if (markers.length === 0) return;
    const key = markers.map((m) => `${m.id}:${m.latitude},${m.longitude}`).join("|");
    if (key === previousKeyRef.current) return;
    previousKeyRef.current = key;

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 8);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
  }, [markers, map]);

  return null;
}
