import { useMemo, type ReactElement } from "react";
import { Box } from "@mantine/core";
import { RouteOff } from "lucide-react";
import { decodePolyline, simplifyPath, type LatLng, type Point } from "@/utils/polyline";

// Normalizes routes into a viewBox shared by thumbnails and detail maps.
const VIEW = 100;

interface RouteMapProps {
  // Holds the encoded route or null for rides without GPS data.
  polyline: string | null;
  // Defines rendered width; height is supplied separately.
  width: number | string;
  height: number;
  strokeWidth?: number;
  // How far a point may stray from the line before it is dropped, in viewBox units - one
  // unit is a hundredth of the map's longest side. Left out, every point is drawn, which
  // is what a map big enough to show them wants. A thumbnail passes a tolerance because
  // it is drawing thousands of points into fifty pixels.
  simplify?: number;
}

// Fits decoded points into the viewBox while preserving proportions.
function toViewPoints(points: LatLng[]): Point[] {
  const lats = points.map((point) => point[0]);
  const lngs = points.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Corrects longitude distance by latitude.
  const scale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * scale || 1;
  const spanY = maxLat - minLat || 1;
  // Uses one span to preserve aspect ratio and center the shorter axis.
  const span = Math.max(spanX, spanY);
  const offsetX = (VIEW - (spanX / span) * VIEW) / 2;
  const offsetY = (VIEW - (spanY / span) * VIEW) / 2;

  return points.map(([lat, lng]) => [
    (((lng - minLng) * scale) / span) * VIEW + offsetX,
    // Inverts latitude for SVG's downward-growing y-axis.
    VIEW - (((lat - minLat) / span) * VIEW + offsetY),
  ]);
}

// Writes projected points as an SVG path.
function toPath(points: Point[]): string {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

// Renders a route outline without map tiles or network requests.
export function RouteMap({ polyline, width, height, strokeWidth = 2, simplify = 0 }: RouteMapProps): ReactElement {
  // Caches decoded route paths across list rerenders.
  const path = useMemo(() => {
    if (polyline === null || polyline.length === 0) return null;
    const points = decodePolyline(polyline);
    // Ignores a single point because it is not a route.
    if (points.length < 2) return null;
    // Simplify in the space the route is drawn in, so the tolerance means what it says.
    return toPath(simplifyPath(toViewPoints(points), simplify));
  }, [polyline, simplify]);

  if (path === null) {
    // Preserves layout space for rides without a route.
    return (
      <Box
        w={width}
        h={height}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RouteOff size={Math.min(height * 0.4, 24)} color="var(--color-text-dim)" />
      </Box>
    );
  }

  return (
    <Box w={width} h={height} style={{ flexShrink: 0 }}>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        height="100%"
        // Prevents SVG letterboxing after path normalization.
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--mantine-color-strava-6)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          // Preserves stroke weight across rendered sizes.
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
}
