// WMO weather code → plain English description
const WMO_CODES: Record<number, string> = {
  0: "clear skies",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "icy fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with heavy hail",
};

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&temperature_unit=fahrenheit&timezone=auto`,
      { next: { revalidate: 0 } },
    );
    const data = await res.json();
    const temp = Math.round(data.current?.temperature_2m);
    const code = data.current?.weathercode;
    const description = WMO_CODES[code] ?? "clear skies";
    return `${temp}°F, ${description}`;
  } catch {
    return null;
  }
}
