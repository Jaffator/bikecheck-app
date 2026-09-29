// Leaflet lives only in this module, so React.lazy keeps it out of the main bundle.
import { useMemo, type ReactElement } from "react";
import { AttributionControl, CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RideMap.css";
import type { LatLng } from "@/utils/polyline";

// {r} asks for @2x tiles on high-density screens only.
const TILES = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_KEY}`;
const ATTRIBUTION = "© OpenStreetMap © CARTO";
const ROUTE_COLOR = "var(--mantine-color-strava-6)";
const MARKER_COLOR = "var(--mantine-color-white)";

interface RideMapLeafletProps {
  points: LatLng[];
  height: number;
  interactive: boolean;
}

export default function RideMapLeaflet({ points, height, interactive }: RideMapLeafletProps): ReactElement {
  const bounds = useMemo(() => latLngBounds(points), [points]);
  const start = points[0];
  const finish = points[points.length - 1];

  return (
    <MapContainer
      // MapContainer reads its props once; another route needs a fresh map.
      key={bounds.toBBoxString()}
      bounds={bounds}
      boundsOptions={{ padding: [12, 12] }}
      // Whole zoom steps halve the route when fitting; the buttons still step by one.
      zoomSnap={0}
      zoomDelta={1}
      className={interactive ? "ride-map" : "ride-map ride-map--static"}
      style={{ height, width: "100%" }}
      attributionControl={false}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <AttributionControl position="bottomright" prefix={false} />
      <Polyline positions={points} pathOptions={{ color: ROUTE_COLOR, weight: 3 }} interactive={false} />
      <CircleMarker
        center={start}
        radius={5}
        pathOptions={{ color: ROUTE_COLOR, fillColor: MARKER_COLOR, fillOpacity: 1, weight: 2 }}
        interactive={false}
      />
      <CircleMarker
        center={finish}
        radius={5}
        pathOptions={{ color: MARKER_COLOR, fillColor: ROUTE_COLOR, fillOpacity: 1, weight: 2 }}
        interactive={false}
      />
    </MapContainer>
  );
}
