import {
  CONDITIONS,
  getJson,
  type Condition,
  type Coords,
  type DayForecast,
  type Hour,
  type Source,
} from "./types";

// https://developer.yr.no/doc/locationforecast/HowTO/
// Browsers can't set User-Agent; MET identifies browser apps by the Origin header instead.

interface Period {
  summary: { symbol_code: string };
  details?: { precipitation_amount?: number };
}

export interface Timestep {
  time: string;
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } };
    next_1_hours?: Period;
    next_6_hours?: Period;
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

/** MET's full timeline: hourly for the first couple of days, then every six hours, ~9 days out. */
export async function fetchTimeline({ lat, lon }: Coords, signal: AbortSignal) {
  // MET asks for max 4 decimals so their cache works.
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const data = await getJson<Compact>(url, signal);
  return data.properties.timeseries;
}

const symbolCode = (period: Period) =>
  period.summary.symbol_code.replace(/_(day|night|polartwilight)$/, "");

/**
 * Cuts the timeline into calendar days in the place's zone (a fixed offset, so a DST switch
 * inside the window puts an hour on the wrong side of midnight; close enough).
 * Temperatures are point readings, so on the six-hourly days the max and min are a bit tamer
 * than what the models report as their true daily extremes.
 */
export function yrDays(timeline: Timestep[], utcOffset: number): DayForecast[] {
  interface Bucket {
    temps: number[];
    winds: number[];
    precipitation: number;
    /** Hours of each symbol, so a day votes on its weather. */
    hours: Map<string, number>;
  }
  const buckets = new Map<string, Bucket>();
  let coveredUntil = 0;
  for (const step of timeline) {
    const t = Date.parse(step.time);
    const date = new Date(t + utcOffset * 1000).toISOString().slice(0, 10);
    let b = buckets.get(date);
    if (!b) buckets.set(date, (b = { temps: [], winds: [], precipitation: 0, hours: new Map() }));
    b.temps.push(step.data.instant.details.air_temperature);
    b.winds.push(step.data.instant.details.wind_speed);

    // Periods overlap (each hourly step also has a six-hour outlook), so only count a period
    // once the previous one has run out.
    if (t < coveredUntil) continue;
    const [period, length] = step.data.next_1_hours
      ? [step.data.next_1_hours, 1]
      : step.data.next_6_hours
        ? [step.data.next_6_hours, 6]
        : [undefined, 0];
    if (!period) continue;
    coveredUntil = t + length * 3_600_000;
    b.precipitation += period.details?.precipitation_amount ?? 0;
    const code = symbolCode(period);
    b.hours.set(code, (b.hours.get(code) ?? 0) + length);
  }

  const days: DayForecast[] = [];
  for (const [date, b] of buckets) {
    // Skip the stubs at either end of the timeline (a lone 00:00 step is not a day).
    if (b.temps.length < 3 || b.hours.size === 0) continue;
    const code = [...b.hours].sort(
      ([a, ha], [c, hc]) =>
        hc - ha || CONDITIONS.indexOf(toCondition(c)) - CONDITIONS.indexOf(toCondition(a)),
    )[0]![0];
    days.push({
      forecaster: "yr",
      date,
      condition: toCondition(code),
      description: describe(code),
      tempMax: Math.max(...b.temps),
      tempMin: Math.min(...b.temps),
      precipitation: b.precipitation,
      windMax: Math.max(...b.winds),
    });
  }
  return days;
}

export const yr: Source = {
  id: "yr",
  name: "Yr",
  url: "https://www.yr.no",
  async fetch(coords, signal) {
    const timeline = await fetchTimeline(coords, signal);
    const now = Date.now();
    // The series starts at the top of the current hour; pick the step closest to now.
    const step = timeline.reduce((best, s) =>
      Math.abs(Date.parse(s.time) - now) < Math.abs(Date.parse(best.time) - now) ? s : best,
    );
    const period = step.data.next_1_hours ?? step.data.next_6_hours;
    const code = period ? symbolCode(period) : "cloudy";
    // The hourly part of the timeline, i.e. the steps that have a one-hour outlook.
    const hours: Hour[] = timeline.flatMap((s) => {
      const p = s.data.next_1_hours;
      if (!p) return [];
      const c = symbolCode(p);
      return [
        {
          time: new Date(s.time),
          temp: s.data.instant.details.air_temperature,
          condition: toCondition(c),
          description: describe(c),
          precipitation: p.details?.precipitation_amount ?? 0,
        },
      ];
    });
    return {
      source: "yr",
      temp: step.data.instant.details.air_temperature,
      windSpeed: step.data.instant.details.wind_speed,
      condition: toCondition(code),
      description: describe(code),
      hours,
    };
  },
};
