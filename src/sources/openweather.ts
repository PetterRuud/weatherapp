import { getJson, type Condition, type Source } from "./types";

// https://openweathermap.org/current
interface Current {
  name: string;
  main: { temp: number };
  wind: { speed: number };
  weather: { id: number; description: string }[];
  sys: { sunrise: number; sunset: number };
}

// https://openweathermap.org/weather-conditions
function toCondition(id: number): Condition {
  if (id < 300) return "thunder";
  if (id < 600) return "rain";
  if (id < 700) return "snow";
  if (id < 800) return id >= 771 ? "wind" : "fog";
  if (id === 800) return "clear";
  if (id <= 802) return "partly";
  return "cloudy";
}

const key = import.meta.env.VITE_OPENWEATHER_KEY;

export const openweather: Source = {
  id: "openweather",
  name: "OpenWeather",
  url: "https://openweathermap.org",
  disabledReason: key ? undefined : "mangler VITE_OPENWEATHER_KEY",
  async fetch({ lat, lon }, signal) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=no&appid=${key}`;
    const data = await getJson<Current>(url, signal);
    const weather = data.weather[0];
    return {
      source: "openweather",
      temp: data.main.temp,
      windSpeed: data.wind.speed,
      condition: toCondition(weather?.id ?? 804),
      description: weather?.description ?? "noe",
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      place: data.name || undefined,
    };
  },
};
