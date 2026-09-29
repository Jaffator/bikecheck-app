import { lazy, Suspense, useMemo, type CSSProperties, type ReactElement } from "react";
import { Box } from "@mantine/core";
import { RouteMap } from "@/components/RouteMap";
import { decodePolyline } from "@/utils/polyline";

const RideMapLeaflet = lazy(() => import("./RideMapLeaflet"));

// A ride without GPS keeps the SVG placeholder and never asks for a tile.
const NO_ROUTE_HEIGHT = 140;

// The map's own surface, inline because its stylesheet arrives with the lazy chunk.
const LOADING_STYLE: CSSProperties = {
  backgroundColor: "var(--color-decor-sunk)",
  borderRadius: "var(--mantine-radius-sm)",
};

interface RideMapProps {
  // Null for rides without GPS data.
  polyline: string | null;
  height: number;
  // Off, the map is a picture: no drag, zoom or controls.
  interactive: boolean;
}

// The route on real map tiles.
export function RideMap({ polyline, height, interactive }: RideMapProps): ReactElement {
  const points = useMemo(() => (polyline === null ? [] : decodePolyline(polyline)), [polyline]);

  if (points.length < 2) return <RouteMap polyline={null} width="100%" height={NO_ROUTE_HEIGHT} />;

  return (
    <Suspense fallback={<Box h={height} style={LOADING_STYLE} />}>
      <RideMapLeaflet points={points} height={height} interactive={interactive} />
    </Suspense>
  );
}
