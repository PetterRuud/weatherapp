import { getJson, type Condition, type Source } from "./types";

// https://open-meteo.com/en/docs
interface Forecast {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
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
      wind_speed_unit: "ms",
      timeformat: "unixtime",
      timezone: "auto",
      forecast_days: "1",
    });
    const data = await getJson<Forecast>(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      signal,
    );
    const [condition, description] = CODES[data.current.weather_code] ?? ["cloudy", "noe rart"];
    const sunrise = data.daily.sunrise[0];
    const sunset = data.daily.sunset[0];
    return {
      source: "openmeteo",
      temp: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      condition,
      description,
      sunrise: sunrise ? new Date(sunrise * 1000) : undefined,
      sunset: sunset ? new Date(sunset * 1000) : undefined,
    };
  },
};
