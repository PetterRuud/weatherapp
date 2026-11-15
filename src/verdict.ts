import { CONDITIONS, type Condition, type Reading } from "./sources";

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
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sources vote on the condition. A tie goes to the worse weather, because Norway. */
export function getVerdict(readings: Reading[]): Verdict {
  const votes = new Map<Condition, number>();
  for (const r of readings) votes.set(r.condition, (votes.get(r.condition) ?? 0) + 1);
  let condition = [...votes].sort(
    ([a, va], [b, vb]) => vb - va || CONDITIONS.indexOf(b) - CONDITIONS.indexOf(a),
  )[0]![0];

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
  };
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

/** Search terms for the Giphy background. */
export const GIF_QUERY: Record<Condition, string> = {
  clear: "sunshine",
  partly: "sun clouds",
  cloudy: "cloudy sky",
  fog: "fog",
  wind: "windy",
  rain: "rain",
  snow: "snow",
  thunder: "thunderstorm",
};
