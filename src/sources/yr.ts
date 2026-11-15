import { getJson, type Condition, type Source } from "./types";

// https://developer.yr.no/doc/locationforecast/HowTO/
// Browsers can't set User-Agent; MET identifies browser apps by the Origin header instead.

interface Timestep {
  time: string;
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } };
    next_1_hours?: { summary: { symbol_code: string } };
    next_6_hours?: { summary: { symbol_code: string } };
  };
}

interface Compact {
  properties: { timeseries: Timestep[] };
}

const NAMES: Record<string, string> = {
  clearsky: "klarvær",
  fair: "lettskyet",
  partlycloudy: "delvis skyet",
  cloudy: "skyet",
  fog: "tåke",
  lightrain: "lett regn",
  rain: "regn",
  heavyrain: "kraftig regn",
  lightrainshowers: "lette regnbyger",
  rainshowers: "regnbyger",
  heavyrainshowers: "kraftige regnbyger",
  lightsleet: "lett sludd",
  sleet: "sludd",
  heavysleet: "kraftig sludd",
  sleetshowers: "sluddbyger",
  lightsnow: "lett snø",
  snow: "snø",
  heavysnow: "kraftig snø",
  snowshowers: "snøbyger",
};

function toCondition(code: string): Condition {
  if (code.includes("thunder")) return "thunder";
  if (code.includes("snow") || code.includes("sleet")) return "snow";
  if (code.includes("rain")) return "rain";
  if (code === "fog") return "fog";
  if (code === "cloudy") return "cloudy";
  if (code === "fair" || code === "partlycloudy") return "partly";
  return "clear";
}

function describe(code: string): string {
  if (NAMES[code]) return NAMES[code];
  if (code.includes("thunder")) return `${describe(code.replace("andthunder", ""))} og torden`;
  return code;
}

export const yr: Source = {
  id: "yr",
  name: "Yr",
  url: "https://www.yr.no",
  async fetch({ lat, lon }, signal) {
    // MET asks for max 4 decimals so their cache works.
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
    const data = await getJson<Compact>(url, signal);
    const now = Date.now();
    // The series starts at the top of the current hour; pick the step closest to now.
    const step = data.properties.timeseries.reduce((best, s) =>
      Math.abs(Date.parse(s.time) - now) < Math.abs(Date.parse(best.time) - now) ? s : best,
    );
    const symbol =
      (step.data.next_1_hours ?? step.data.next_6_hours)?.summary.symbol_code ?? "cloudy";
    const code = symbol.replace(/_(day|night|polartwilight)$/, "");
    return {
      source: "yr",
      temp: step.data.instant.details.air_temperature,
      windSpeed: step.data.instant.details.wind_speed,
      condition: toCondition(code),
      description: describe(code),
    };
  },
};
