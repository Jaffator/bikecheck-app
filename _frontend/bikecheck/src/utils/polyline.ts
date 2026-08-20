// Google's encoded polyline format, which is what Strava hands back in
// activity.map.summary_polyline. Decoding it here keeps route drawing free of a
// map library: the shape of a ride is enough to recognise it, and a shape needs
// no tiles, no key and no network.

export type LatLng = [number, number];

// Reads one varint out of the encoded string, starting at `index`. Returns the
// value along with the position after it, because each coordinate is two of
// these back to back.
function readValue(
  encoded: string,
  index: number,
): { value: number; next: number } {
  let result = 0;
  let shift = 0;
  let byte: number;

  // Every chunk carries five bits and sets the continuation bit while more
  // follow.
  do {
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  // The low bit marks a negative value, and the rest is the magnitude.
  return { value: result & 1 ? ~(result >> 1) : result >> 1, next: index };
}

// Decodes to absolute coordinates. Values in the string are deltas from the
// previous point, which is what keeps the format small.
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
