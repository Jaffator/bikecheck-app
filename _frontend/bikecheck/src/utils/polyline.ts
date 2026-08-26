// Decodes Strava's Google-encoded summary polylines without a map library.

export type LatLng = [number, number];

// A point in whatever flat space it is being drawn in. Simplifying happens after a
// route is projected, never on latitudes: a tolerance is only meaningful once the
// coordinates are the ones actually rendered.
export type Point = [number, number];

// Reads one encoded coordinate value and returns the next character index.
function readValue(encoded: string, index: number): { value: number; next: number } {
  let result = 0;
  let shift = 0;
  let byte: number;

  // Five-bit chunks continue while the high bit is set.
  do {
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  // The low bit marks a negative value, and the rest is the magnitude.
  return { value: result & 1 ? ~(result >> 1) : result >> 1, next: index };
}

// Decodes delta-encoded coordinates into absolute latitude and longitude pairs.
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const latPart = readValue(encoded, index);
    lat += latPart.value;

    const lngPart = readValue(encoded, latPart.next);
    lng += lngPart.value;

    index = lngPart.next;
    // Coordinates are stored at five decimal places.
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Perpendicular distance from a point to the line through `start` and `end`, which is
// what Ramer-Douglas-Peucker measures a detour by. Squared, because only the comparison
// against a tolerance matters and a square root per point is a cost with no reader.
function squaredDistanceToSegment(point: Point, start: Point, end: Point): number {
  const [pointX, pointY] = point;
  const [startX, startY] = start;
  const spanX = end[0] - startX;
  const spanY = end[1] - startY;
  const spanLength = spanX * spanX + spanY * spanY;

  // A segment of no length is a point, so the detour is the distance to it.
  if (spanLength === 0) {
    return (pointX - startX) ** 2 + (pointY - startY) ** 2;
  }

  // How far along the segment the nearest point lies, clamped to its ends.
  const along = Math.min(1, Math.max(0, ((pointX - startX) * spanX + (pointY - startY) * spanY) / spanLength));
  const nearestX = startX + along * spanX;
  const nearestY = startY + along * spanY;

  return (pointX - nearestX) ** 2 + (pointY - nearestY) ** 2;
}

// Ramer-Douglas-Peucker: keeps the point that strays furthest from the straight line
// between two ends, then asks the same of each half, until nothing strays further than
// the tolerance. Corners survive and redundant points on a straight run do not, which is
// what keeps a route recognisable once it is drawn the size of a thumbnail.
export function simplifyPath(points: Point[], tolerance: number): Point[] {
  // Two points are already a straight line, and a tolerance of nothing simplifies nothing.
  if (points.length < 3 || tolerance <= 0) return points;

  const squaredTolerance = tolerance * tolerance;
  // Which points survive, so the two halves can be walked without joining arrays.
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  // Explicit stack rather than recursion: a dense route is thousands of points deep.
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let furthest = -1;
    let furthestDistance = squaredTolerance;

    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredDistanceToSegment(points[index], points[first], points[last]);
      if (distance > furthestDistance) {
        furthest = index;
        furthestDistance = distance;
      }
    }

    // Nothing strays far enough, so the straight line stands in for the whole stretch.
    if (furthest === -1) continue;

    keep[furthest] = 1;
    stack.push([first, furthest], [furthest, last]);
  }

  return points.filter((_, index) => keep[index] === 1);
}
