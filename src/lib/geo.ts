"use client";

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
}

export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await reverseGeocode(lat, lng);
        resolve({ lat, lng, label });
      },
      () => reject(new Error("Location denied")),
      { timeout: 10000 },
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  return (
    (await fromNominatim(lat, lng)) ??
    (await fromBigDataCloud(lat, lng)) ??
    `${lat.toFixed(2)}, ${lng.toFixed(2)}`
  );
}

async function fromNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.county || a.state || "";
    return [city, a.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

// Fallback for networks that can't reach Nominatim.
async function fromBigDataCloud(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision || "";
    return [city, data.countryName].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}
