// Decodes Strava's Google-encoded summary polylines without a map library.

export type LatLng = [number, number];

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
