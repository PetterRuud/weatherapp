import {
  CONDITIONS,
  type Condition,
  type DayForecast,
  type ForecasterId,
  type Hour,
  type Reading,
  type SourceId,
} from "./sources";

export interface Verdict {
  temp: number;
  condition: Condition;
  description: string;
  windSpeed: number;
  /** Difference between the warmest and coldest source, in °C. */
  spread: number;
  coldest: Reading;
  warmest: Reading;
  sunrise?: Date;
  sunset?: Date;
  place?: string;
  utcOffset?: number;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Majority vote. A tie goes to the worse weather, because Norway. */
function vote(conditions: Condition[]): Condition {
  const votes = new Map<Condition, number>();
  for (const c of conditions) votes.set(c, (votes.get(c) ?? 0) + 1);
  return [...votes].sort(
    ([a, va], [b, vb]) => vb - va || CONDITIONS.indexOf(b) - CONDITIONS.indexOf(a),
  )[0]![0];
}

/** Sources vote on the condition and average the numbers. */
export function getVerdict(readings: Reading[]): Verdict {
  let condition = vote(readings.map((r) => r.condition));

  const windSpeed = avg(readings.map((r) => r.windSpeed));
  const calm = ["clear", "partly", "cloudy", "fog"].includes(condition);
  if (calm && windSpeed >= 10) condition = "wind";

  const winner = readings.find((r) => r.condition === condition);
  const sorted = [...readings].sort((a, b) => a.temp - b.temp);
  const pick = <K extends keyof Reading>(k: K) => readings.find((r) => r[k] !== undefined)?.[k];

  return {
    temp: avg(readings.map((r) => r.temp)),
    condition,
    description: winner?.description ?? "kjempeblåsete",
    windSpeed,
    spread: sorted.at(-1)!.temp - sorted[0]!.temp,
    coldest: sorted[0]!,
    warmest: sorted.at(-1)!,
    sunrise: pick("sunrise") as Date | undefined,
    sunset: pick("sunset") as Date | undefined,
    place: pick("place") as string | undefined,
    utcOffset: pick("utcOffset") as number | undefined,
  };
}

/** What the sources together say about one hour. */
export interface HourVerdict {
  time: Date;
  temp: number;
  condition: Condition;
  description: string;
  precipitation: number;
  /** Each source's temperature for the hour. */
  temps: { source: SourceId; temp: number }[];
  spread: number;
}

const WET: Condition[] = ["rain", "snow", "thunder"];
const isWet = (h: { condition: Condition; precipitation: number }) =>
  h.precipitation >= 0.2 || WET.includes(h.condition);

/**
 * The hours left of today in the place's zone, voted on like the front page.
 * Late in the evening it keeps going past midnight so there's always something to look at.
 */
export function getRestOfDay(readings: Reading[], utcOffset?: number, minHours = 6): HourVerdict[] {
  const offset = utcOffset ?? -new Date().getTimezoneOffset() * 60;
  const dateAt = (ms: number) => new Date(ms + offset * 1000).toISOString().slice(0, 10);
  const today = dateAt(Date.now());
  const thisHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;

  const byHour = new Map<number, (Hour & { source: SourceId })[]>();
  for (const r of readings) {
    for (const h of r.hours ?? []) {
      const t = h.time.getTime();
      if (t < thisHour) continue;
      byHour.set(t, [...(byHour.get(t) ?? []), { ...h, source: r.source }]);
    }
  }

  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const keep = hours.filter((t, i) => dateAt(t) === today || i < minHours);
  return keep.map((t) => {
    const hs = byHour.get(t)!;
    const condition = vote(hs.map((h) => h.condition));
    const temps = hs.map((h) => h.temp);
    return {
      time: new Date(t),
      temp: avg(temps),
      condition,
      description: hs.find((h) => h.condition === condition)!.description,
      precipitation: avg(hs.map((h) => h.precipitation)),
      temps: hs.map((h) => ({ source: h.source, temp: h.temp })),
      spread: Math.max(...temps) - Math.min(...temps),
    };
  });
}

/** When does the rain (or snow) come, or stop? */
export function restOfDayQuip(hours: HourVerdict[], clock: (d: Date) => string): string {
  if (hours.length === 0) return "";
  const firstWet = hours.findIndex(isWet);
  if (firstWet === -1) return "Tørt resten av dagen. Nyt det.";
  const what = (h: HourVerdict) =>
    h.condition === "snow" ? "Snø" : h.condition === "thunder" ? "Torden" : "Nedbør";
  if (firstWet > 0) return `${what(hours[firstWet]!)} fra kl. ${clock(hours[firstWet]!.time)}.`;
  const firstDry = hours.findIndex((h) => !isWet(h));
  if (firstDry === -1) return `${what(hours[0]!)} resten av dagen. Selvfølgelig.`;
  return `${what(hours[0]!)} nå, men det gir seg rundt kl. ${clock(hours[firstDry]!.time)}.`;
}

export function tempQuip(temp: number): string {
  if (temp <= -15) return "Bli inne. Seriøst.";
  if (temp <= -5) return "Kaldt som faen.";
  if (temp < 3) return "Lue. Votter. Ingen diskusjon.";
  if (temp < 10) return "Jakke, for faen.";
  if (temp < 17) return "Norsk sommer, eller vår, eller høst.";
  if (temp < 24) return "Helt greit egentlig.";
  return "Varmt som faen. Klag litt.";
}

export function windQuip(speed: number): string {
  if (speed < 2) return "vindstille";
  if (speed < 6) return "litt trekk";
  if (speed < 11) return "frisyren ryker";
  if (speed < 17) return "paraplyen ryker";
  return "du ryker";
}

export function argumentQuip(spread: number, sources: number): string {
  if (sources < 2) return "Bare én kilde svarte. Ingen å krangle med.";
  if (spread < 0.5) return "Alle er enige. Det har aldri skjedd før.";
  if (spread < 1.5) return "Stort sett enige. Litt mumling i krokene.";
  if (spread < 3) return "Det er uenighet i rekkene.";
  return "Meteorologene krangler for faen!";
}

/** What the forecasters together say about one day. */
export interface DayVerdict {
  /** Midnight in the browser's zone; only the calendar date matters. */
  date: Date;
  key: string;
  forecasts: DayForecast[];
  condition: Condition;
  description: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windMax: number;
  /** How many forecasters expect at least a millimetre. */
  wetVotes: number;
  /** Difference between the warmest and coldest daytime high, in °C. */
  spread: number;
  coldest: ForecasterId;
  warmest: ForecasterId;
}

/** Groups forecasts by date and lets each day vote, the same way the front page does. */
export function getDayVerdicts(forecasts: DayForecast[]): DayVerdict[] {
  const byDate = new Map<string, DayForecast[]>();
  for (const f of forecasts) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);
  return [...byDate.keys()].sort().map((key) => {
    const fs = byDate.get(key)!;
    const condition = vote(fs.map((f) => f.condition));
    const sorted = [...fs].sort((a, b) => a.tempMax - b.tempMax);
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    return {
      date: new Date(y, m - 1, d),
      key,
      forecasts: fs,
      condition,
      description: fs.find((f) => f.condition === condition)!.description,
      tempMax: avg(fs.map((f) => f.tempMax)),
      tempMin: avg(fs.map((f) => f.tempMin)),
      precipitation: avg(fs.map((f) => f.precipitation)),
      windMax: avg(fs.map((f) => f.windMax)),
      wetVotes: fs.filter((f) => f.precipitation >= 1).length,
      spread: sorted.at(-1)!.tempMax - sorted[0]!.tempMax,
      coldest: sorted[0]!.forecaster,
      warmest: sorted.at(-1)!.forecaster,
    };
  });
}

/** How miserable a day looks: worse condition, more rain and more wind all count against it. */
export function misery(day: DayVerdict): number {
  return CONDITIONS.indexOf(day.condition) + day.precipitation / 2 + day.windMax / 5;
}

export function outlookQuip(days: DayVerdict[]): string {
  const wet = days.filter((d) => d.precipitation >= 1 || WET.includes(d.condition)).length;
  const share = wet / days.length;
  if (share === 0) return "Ikke en dråpe i sikte. Noe er galt.";
  if (share < 0.25) return `Nedbør ${wet} av ${days.length} dager. Nyt det mens det varer.`;
  if (share < 0.6) return `Nedbør ${wet} av ${days.length} dager. Helt normalt, dessverre.`;
  if (share < 1) return `Nedbør ${wet} av ${days.length} dager. Selvfølgelig.`;
  return "Nedbør hver eneste dag. Velkommen til Norge.";
}

/** A day is a fight when the daytime highs are this far apart. */
export const FIGHT = 3;

export function agreementQuip(days: DayVerdict[]): string {
  const contested = days.filter((d) => d.forecasts.length > 1);
  if (contested.length === 0) return "Bare én modell svarte. Ingen å krangle med.";
  const first = contested.findIndex((d) => d.spread >= FIGHT);
  if (first === -1) return "Enige hele veien. Mistenkelig.";
  if (first === 0) return "De krangler allerede om i dag.";
  if (first === 1) return "Enige om i dag. Så begynner krangelen.";
  return `Enige i ${first} dager. Så krangler de.`;
}
