/** Ordered from nicest to most miserable, so a tie in the vote goes to the worst weather. */
export const CONDITIONS = [
  "clear",
  "partly",
  "cloudy",
  "fog",
  "wind",
  "rain",
  "snow",
  "thunder",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export interface Coords {
  lat: number;
  lon: number;
}

/** One source's take on the weather right now, normalised to a common shape. */
export interface Reading {
  source: SourceId;
  temp: number;
  condition: Condition;
  /** Norwegian, lower case, e.g. "lett regn". */
  description: string;
  windSpeed: number;
  sunrise?: Date;
  sunset?: Date;
  place?: string;
  /** The place's offset from UTC in seconds, for knowing where "today" ends. */
  utcOffset?: number;
  /** Hour by hour from the current hour, about a day out. Not every source has this. */
  hours?: Hour[];
}

/** One source's forecast for one hour. */
export interface Hour {
  /** Start of the hour. */
  time: Date;
  temp: number;
  condition: Condition;
  description: string;
  /** Millimetres during the hour. */
  precipitation: number;
}

/** Who can say something about a whole day: Yr, or one of the models Open-Meteo serves. */
export type ForecasterId = "yr" | "ecmwf" | "gfs" | "icon";

export interface Forecaster {
  id: ForecasterId;
  name: string;
  url: string;
}

/** One forecaster's take on one day, normalised to a common shape. */
export interface DayForecast {
  forecaster: ForecasterId;
  /** Calendar date in the place's own time zone, "2026-11-18". */
  date: string;
  condition: Condition;
  description: string;
  tempMax: number;
  tempMin: number;
  /** Millimetres over the whole day. */
  precipitation: number;
  windMax: number;
}

export type SourceId = "yr" | "openweather" | "openmeteo";

export interface Source {
  id: SourceId;
  name: string;
  url: string;
  /** Set when the source is missing config (an API key) and should be skipped. */
  disabledReason?: string;
  fetch: (coords: Coords, signal: AbortSignal) => Promise<Reading>;
}

export async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${new URL(url).host} svarte ${res.status}`);
  return res.json() as Promise<T>;
}
