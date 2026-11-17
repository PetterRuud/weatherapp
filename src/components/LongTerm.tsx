import { useEffect, useMemo, useState } from "react";
import {
  FORECASTERS,
  fetchModelDays,
  fetchTimeline,
  yrDays,
  type Coords,
  type ForecasterId,
} from "../sources";
import { FIGHT, agreementQuip, getDayVerdicts, misery, outlookQuip } from "../verdict";
import { sourceDot } from "./Krangelmeter";
import { WeatherIcon } from "./WeatherIcon";

type Load<T> = { status: "loading" } | { status: "ok"; value: T } | { status: "error" };

function useLoad<T>(coords: Coords, load: (c: Coords, signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Load<T>>({ status: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    load(coords, ctrl.signal)
      .then((value) => setState({ status: "ok", value }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: "error" });
      });
    return () => ctrl.abort();
  }, [coords, load]);
  return state;
}

/** Yr and the Open-Meteo models load side by side; whoever answers first is shown first. */
function useDays(coords: Coords) {
  const models = useLoad(coords, fetchModelDays);
  const yr = useLoad(coords, fetchTimeline);

  const days = useMemo(() => {
    // Yr has no time zone, so borrow the place's offset from Open-Meteo. Until it answers
    // (or if it fails), the browser's own offset is a decent guess.
    const offset =
      models.status === "ok" ? models.value.utcOffset : -new Date().getTimezoneOffset() * 60;
    return getDayVerdicts([
      ...(models.status === "ok" ? models.value.days : []),
      ...(yr.status === "ok" ? yrDays(yr.value, offset) : []),
    ]);
  }, [models, yr]);

  const status = (id: ForecasterId) => (id === "yr" ? yr.status : models.status);
  const loading = models.status === "loading" || yr.status === "loading";
  return { days, status, loading };
}

const num = (n: number) => n.toFixed(1).replace(".", ",");
const nameOf = (id: ForecasterId) => FORECASTERS.find((f) => f.id === id)?.name ?? id;

function dayName(date: Date, index: number): string {
  if (index === 0) return "I dag";
  if (index === 1) return "I morgen";
  const weekday = date.toLocaleDateString("nb-NO", { weekday: "short" }).replace(".", "");
  return `${weekday} ${date.getDate()}.`;
}

/**
 * Day-by-day forecast. Each day's bar shows the average low–high, with one dot per
 * forecaster at its daytime high: the further apart the dots, the louder the argument.
 */
export function LongTerm({ coords }: { coords: Coords }) {
  const { days, status, loading } = useDays(coords);

  if (days.length === 0) {
    return (
      <p className="font-display my-auto py-24 text-center text-3xl uppercase">
        {loading ? "Spør om framtida…" : "Framtida svarer ikke. Typisk."}
      </p>
    );
  }

  const low = Math.floor(Math.min(...days.flatMap((d) => d.forecasts.map((f) => f.tempMin))));
  const high = Math.ceil(Math.max(...days.flatMap((d) => d.forecasts.map((f) => f.tempMax))));
  const pos = (t: number) => ((t - low) / Math.max(high - low, 1)) * 100;
  const ranked = [...days].sort((a, b) => misery(a) - misery(b));
  const best = ranked[0];
  const worst = ranked.at(-1);

  return (
    <>
      <p className="font-display mt-3 text-[clamp(2.25rem,11vw,3.5rem)] leading-[0.95] tracking-tight text-balance uppercase">
        De neste {days.length} dagene
      </p>
      <p className="mt-2.5 text-lg font-semibold">{outlookQuip(days)}</p>

      <section className="mt-5 -rotate-[1.2deg] bg-ink p-4 text-paper">
        <h2 className="font-display text-xl uppercase">Krangelmeter</h2>
        <p className="mt-1 font-extrabold">{agreementQuip(days)}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {FORECASTERS.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <span
                className={`size-3 rounded-full border-2 border-paper ${sourceDot(f.id)} ${
                  status(f.id) === "ok" ? "" : "opacity-40"
                }`}
              />
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                {f.name}
              </a>
              {status(f.id) === "loading" && (
                <span className="animate-pulse opacity-70">tenker…</span>
              )}
              {status(f.id) === "error" && <span className="opacity-70">svarte ikke</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs opacity-70">
          Prikkene viser hver enkelts makstemperatur. ICON ser en uke fram, Yr ni dager, ECMWF to
          uker, GFS hele veien.
        </p>
      </section>

      <ol className="mt-6 border-t-2 border-ink">
        {days.map((day, i) => {
          const badges = [
            day === best && "beste dag",
            day === worst && "verste dag",
            day.forecasts.length > 1 && day.spread >= FIGHT && "krangel",
          ].filter(Boolean);
          const n = day.forecasts.length;
          return (
            <li
              key={day.key}
              className="grid grid-cols-[4.5rem_2.25rem_1fr] items-center gap-x-2.5 border-b border-ink/35 py-2 sm:grid-cols-[5rem_2.5rem_1fr_11rem]"
            >
              <span className="text-sm font-extrabold capitalize">{dayName(day.date, i)}</span>
              <WeatherIcon condition={day.condition} className="size-9 sm:size-10" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{day.description}</span>
                  {badges.map((b) => (
                    <span
                      key={String(b)}
                      className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-extrabold text-paper"
                    >
                      {b}
                    </span>
                  ))}
                </span>
                <span className="block text-xs tabular-nums opacity-75">
                  {day.precipitation >= 0.1 ? `${num(day.precipitation)} mm` : "tørt"}
                  {n > 1 && day.wetVotes > 0 && ` · ${day.wetVotes} av ${n} sier nedbør`}
                  {` · ${Math.round(day.windMax)} m/s`}
                </span>
              </span>
              <span className="col-span-3 flex items-center gap-2 pt-1 sm:col-span-1 sm:pt-0">
                <span className="w-8 text-right text-sm font-semibold tabular-nums opacity-75">
                  {Math.round(day.tempMin)}°
                </span>
                <span className="relative h-2 flex-1 rounded-full bg-ink/15">
                  <span
                    className="absolute inset-y-0 rounded-full bg-ink"
                    style={{
                      left: `${pos(day.tempMin)}%`,
                      right: `${100 - pos(day.tempMax)}%`,
                    }}
                  />
                  {n > 1 &&
                    day.forecasts.map((f, z) => (
                      <span
                        key={f.forecaster}
                        title={`${nameOf(f.forecaster)}: ${num(f.tempMax)}°`}
                        className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink ${sourceDot(f.forecaster)}`}
                        style={{ left: `${pos(f.tempMax)}%`, zIndex: z + 1 }}
                      />
                    ))}
                </span>
                <span className="font-display w-9 text-lg tabular-nums">
                  {Math.round(day.tempMax)}°
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
