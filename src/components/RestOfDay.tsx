import { SOURCES } from "../sources";
import { restOfDayQuip, type HourVerdict } from "../verdict";
import { WeatherIcon } from "./WeatherIcon";

const num = (n: number) => n.toFixed(1).replace(".", ",");
const sourceName = (id: string) => SOURCES.find((s) => s.id === id)?.name ?? id;

/** A sideways-scrolling strip with one column per hour that's left of today. */
export function RestOfDay({ hours, utcOffset }: { hours: HourVerdict[]; utcOffset?: number }) {
  if (hours.length === 0) return null;

  // Show hours on the place's clock, not the browser's.
  const offset = utcOffset ?? -new Date().getTimezoneOffset() * 60;
  const clock = (d: Date) =>
    String(new Date(d.getTime() + offset * 1000).getUTCHours()).padStart(2, "0");
  const thisHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-display text-xl uppercase">Resten av dagen</h2>
        <p className="text-sm font-semibold">{restOfDayQuip(hours, clock)}</p>
      </div>
      <ol className="-mx-5 mt-2 flex snap-x overflow-x-auto px-5 pb-2">
        {hours.map((h) => {
          const now = h.time.getTime() === thisHour;
          return (
            <li
              key={h.time.getTime()}
              title={`${h.description}\n${h.temps
                .map((t) => `${sourceName(t.source)}: ${num(t.temp)}°`)
                .join("\n")}`}
              aria-current={now ? "time" : undefined}
              className={`flex min-w-14 snap-start flex-col items-center gap-1 py-1 first:border-l-0 ${
                now ? "rounded-lg bg-ink text-paper [&+li]:border-l-0" : "border-l border-ink/35"
              }`}
            >
              <span className="text-xs font-extrabold tabular-nums">
                {now ? "Nå" : clock(h.time)}
              </span>
              <WeatherIcon condition={h.condition} className="size-8" />
              <span className="font-display text-lg tabular-nums">{Math.round(h.temp)}°</span>
              <span className="text-[0.7rem] tabular-nums opacity-75">
                {h.precipitation >= 0.1 ? `${num(h.precipitation)} mm` : " "}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
