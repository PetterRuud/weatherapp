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
