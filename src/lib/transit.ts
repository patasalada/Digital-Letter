const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns unlock timestamp based on distance.
// Domestic (<= 3000 km): 72–168 hours. International: 168–336 hours.
export function computeUnlockTimestamp(distanceKm: number): Date {
  const domesticThreshold = 3000;
  const minHours = distanceKm <= domesticThreshold ? 72 : 168;
  const maxHours = distanceKm <= domesticThreshold ? 168 : 336;

  // Spread linearly within the band — farther = longer
  const band = maxHours - minHours;
  const scale = Math.min(distanceKm / 15000, 1); // normalise to ~max Earth distance
  const hours = minHours + scale * band;

  const now = new Date();
  now.setTime(now.getTime() + hours * 60 * 60 * 1000);
  return now;
}

export function formatTransitDuration(distanceKm: number): string {
  const unlock = computeUnlockTimestamp(distanceKm);
  const hours = Math.round(
    (unlock.getTime() - Date.now()) / (60 * 60 * 1000),
  );
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}
