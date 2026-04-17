// Markham, Ontario approximate city bounds
export const MARKHAM_BOUNDS: [[number, number], [number, number]] = [
  [43.80, -79.40], // SW
  [43.92, -79.21], // NE
];
export const MARKHAM_CENTER: [number, number] = [43.8561, -79.337];

export function isInMarkham(lat: number, lng: number) {
  return lat >= 43.8 && lat <= 43.92 && lng >= -79.4 && lng <= -79.21;
}
