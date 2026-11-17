import {
  getJson,
  type Condition,
  type Coords,
  type DayForecast,
  type ForecasterId,
  type Hour,
  type Source,
} from "./types";

// https://open-meteo.com/en/docs
interface Forecast {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  utc_offset_seconds: number;
  hourly: {
    time: number[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation: number[];
  };
  daily: { sunrise: number[]; sunset: number[] };
}

// WMO weather interpretation codes
const CODES: Record<number, [Condition, string]> = {
  0: ["clear", "klarvær"],
  1: ["partly", "stort sett klart"],
  2: ["partly", "delvis skyet"],
  3: ["cloudy", "overskyet"],
  45: ["fog", "tåke"],
  48: ["fog", "rimtåke"],
  51: ["rain", "lett yr"],
  53: ["rain", "yr"],
  55: ["rain", "tett yr"],
  56: ["rain", "underkjølt yr"],
  57: ["rain", "tett underkjølt yr"],
  61: ["rain", "lett regn"],
  63: ["rain", "regn"],
  65: ["rain", "kraftig regn"],
  66: ["rain", "underkjølt regn"],
  67: ["rain", "kraftig underkjølt regn"],
  71: ["snow", "lett snø"],
  73: ["snow", "snø"],
  75: ["snow", "kraftig snø"],
  77: ["snow", "snøkorn"],
  80: ["rain", "lette regnbyger"],
  81: ["rain", "regnbyger"],
  82: ["rain", "voldsomme regnbyger"],
  85: ["snow", "snøbyger"],
  86: ["snow", "kraftige snøbyger"],
  95: ["thunder", "torden"],
  96: ["thunder", "torden med hagl"],
  99: ["thunder", "torden med kraftig hagl"],
};

export const openmeteo: Source = {
  id: "openmeteo",
  name: "Open-Meteo",
  url: "https://open-meteo.com",
  async fetch({ lat, lon }, signal) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "temperature_2m,weather_code,wind_speed_10m",
      daily: "sunrise,sunset",
      hourly: "temperature_2m,weather_code,precipitation",
      wind_speed_unit: "ms",
      timeformat: "unixtime",
      timezone: "auto",
      // Two days so "the rest of today" still has hours left late in the evening.
      forecast_days: "2",
    });
    const data = await getJson<Forecast>(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      signal,
    );
    const [condition, description] = CODES[data.current.weather_code] ?? ["cloudy", "noe rart"];
    const sunrise = data.daily.sunrise[0];
    const sunset = data.daily.sunset[0];
    const thisHour = Math.floor(Date.now() / 3_600_000) * 3600;
    const hours: Hour[] = [];
    data.hourly.time.forEach((t, i) => {
      if (t < thisHour) return;
      const [condition, description] = CODES[data.hourly.weather_code[i]!] ?? [
        "cloudy",
        "noe rart",
      ];
      hours.push({
        time: new Date(t * 1000),
        temp: data.hourly.temperature_2m[i]!,
        condition,
        description,
        // Hourly precipitation is the sum of the hour *before* the timestamp; shift it to
        // match Yr, where a step's amount covers the hour after.
        precipitation: data.hourly.precipitation[i + 1] ?? 0,
      });
    });
    return {
      source: "openmeteo",
      temp: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      condition,
      description,
      sunrise: sunrise ? new Date(sunrise * 1000) : undefined,
      sunset: sunset ? new Date(sunset * 1000) : undefined,
      utcOffset: data.utc_offset_seconds,
      hours,
    };
  },
};

// The global models Open-Meteo serves. They reach different distances: ICON about a week,
// ECMWF two weeks, GFS the full 16 days. Beyond that a model's values come back as null.
const MODELS = {
  ecmwf: "ecmwf_ifs025",
  gfs: "gfs_seamless",
  icon: "icon_seamless",
} as const satisfies Partial<Record<ForecasterId, string>>;

const DAILY = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "wind_speed_10m_max",
] as const;

interface Daily {
  utc_offset_seconds: number;
  // With several models every field comes back suffixed, e.g. "temperature_2m_max_gfs_seamless".
  daily: { time: string[] } & Record<string, (number | null)[]>;
}

/**
 * Day-by-day forecasts from three models in one request. Also returns the place's UTC offset,
 * which Yr doesn't give us but we need to cut Yr's timeline into days.
 */
export async function fetchModelDays(
  { lat, lon }: Coords,
  signal: AbortSignal,
): Promise<{ days: DayForecast[]; utcOffset: number }> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY.join(","),
    models: Object.values(MODELS).join(","),
    wind_speed_unit: "ms",
    timezone: "auto",
    forecast_days: "16",
  });
  const data = await getJson<Daily>(`https://api.open-meteo.com/v1/forecast?${params}`, signal);
  const days: DayForecast[] = [];
  for (const [id, model] of Object.entries(MODELS) as [keyof typeof MODELS, string][]) {
    const col = (field: (typeof DAILY)[number]) => data.daily[`${field}_${model}`] ?? [];
    data.daily.time.forEach((date, i) => {
      const code = col("weather_code")[i];
      const max = col("temperature_2m_max")[i];
      const min = col("temperature_2m_min")[i];
      if (code == null || max == null || min == null) return; // past this model's horizon
      const [condition, description] = CODES[code] ?? ["cloudy", "noe rart"];
      days.push({
        forecaster: id,
        date,
        condition,
        description,
        tempMax: max,
        tempMin: min,
        precipitation: col("precipitation_sum")[i] ?? 0,
        windMax: col("wind_speed_10m_max")[i] ?? 0,
      });
    });
  }
  return { days, utcOffset: data.utc_offset_seconds };
}
