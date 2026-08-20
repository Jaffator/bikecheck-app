import { useMemo, type ReactElement } from "react";
import { Box } from "@mantine/core";
import { RouteOff } from "lucide-react";
import { decodePolyline, type LatLng } from "@/utils/polyline";

// The viewBox the path is normalised into. Coordinates are fitted to it rather
// than drawn at their own scale, so one component serves both the thumbnail in
// a pending row and the wide map in the sheet.
const VIEW = 100;

interface RouteMapProps {
  // Strava's encoded route. Null for rides recorded without GPS, which draw the
  // placeholder instead.
  polyline: string | null;
  // Rendered width. Height follows unless given separately — a thumbnail is
  // square, the sheet's map is a wide band.
  width: number | string;
  height: number;
  strokeWidth?: number;
}

// Fits decoded points into the viewBox, preserving the route's proportions so a
// long thin valley does not come out looking like a loop.
function toPath(points: LatLng[]): string {
  const lats = points.map((point) => point[0]);
  const lngs = points.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // A degree of longitude covers less ground the further from the equator you
  // are. Without correcting for it every route leans east-west.
  const scale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * scale || 1;
  const spanY = maxLat - minLat || 1;
  // One span for both axes keeps the aspect ratio; the shorter one is centred.
  const span = Math.max(spanX, spanY);
  const offsetX = (VIEW - (spanX / span) * VIEW) / 2;
  const offsetY = (VIEW - (spanY / span) * VIEW) / 2;

  return points
    .map(([lat, lng], index) => {
      const x = (((lng - minLng) * scale) / span) * VIEW + offsetX;
      // SVG's y axis grows downward, latitude grows upward.
      const y = VIEW - (((lat - minLat) / span) * VIEW + offsetY);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// A ride drawn as its own shape. No tiles and no map library: what makes a ride
// recognisable in a list is the outline of where it went, and that needs
// neither a basemap nor a network request.
export function RouteMap({ polyline, width, height, strokeWidth = 2 }: RouteMapProps): ReactElement {
  // Decoding a few hundred points per row is cheap, but not worth redoing on
  // every render of a list that re-renders whenever a sheet opens.
  const path = useMemo(() => {
    if (polyline === null || polyline.length === 0) return null;
    const points = decodePolyline(polyline);
    // A single point is a dot, not a route — nothing worth drawing.
    return points.length < 2 ? null : toPath(points);
  }, [polyline]);

  if (path === null) {
    // Holds the same footprint as a drawn route, so a turbo session lines up
    // with the rides around it instead of shifting the row's text.
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
        // The route is fitted to the box already; letting the SVG letterbox it
        // again would shrink it away from the edges.
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
          // Keeps the line the same weight whatever size the box is rendered at.
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
}
