import { useEffect, useState } from "react";
import { Krangelmeter } from "./components/Krangelmeter";
import { LocationDialog, type Place } from "./components/LocationDialog";
import { LongTerm } from "./components/LongTerm";
import { RestOfDay } from "./components/RestOfDay";
import { SourceCard } from "./components/SourceCard";
import { WeatherIcon } from "./components/WeatherIcon";
import { SOURCES, type Coords, type Reading, type SourceId } from "./sources";
import { argumentQuip, getRestOfDay, getVerdict, tempQuip, windQuip } from "./verdict";

const SKI: Coords & { name: string } = { lat: 59.7195, lon: 10.8358, name: "Ski" };

type Result =
  | { status: "loading" }
  | { status: "ok"; reading: Reading }
  | { status: "error"; message: string };

const time = (d?: Date) =>
  d?.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) ?? "–";

function useWeather(coords: Coords) {
  const [results, setResults] = useState<Partial<Record<SourceId, Result>>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    const initial: Partial<Record<SourceId, Result>> = {};
    for (const source of SOURCES) {
      if (source.disabledReason) {
        initial[source.id] = { status: "error", message: source.disabledReason };
        continue;
      }
      initial[source.id] = { status: "loading" };
      // Each source reports in as soon as it answers; nobody waits for the slowest.
      void source
        .fetch(coords, ctrl.signal)
        .then((reading): Result => ({ status: "ok", reading }))
        .catch((error: unknown): Result => ({
          status: "error",
          message: error instanceof Error ? error.message : "svarte ikke",
        }))
        .then((result) => {
          if (!ctrl.signal.aborted) setResults((prev) => ({ ...prev, [source.id]: result }));
        });
    }
    setResults(initial);
    return () => ctrl.abort();
  }, [coords]);

  return results;
}

type View = "now" | "long";
const viewFromHash = (): View => (location.hash === "#langtid" ? "long" : "now");

/** The view lives in the URL hash so the back button works and #langtid can be linked to. */
function useView() {
  const [view, setView] = useState(viewFromHash);
  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return view;
}

const TABS: { view: View; label: string; href: string }[] = [
  { view: "now", label: "Nå", href: "#" },
  { view: "long", label: "Langtid", href: "#langtid" },
];

export default function App() {
  const [place, setPlace] = useState<Place>(SKI);
  const [dialogOpen, setDialogOpen] = useState(false);
  const view = useView();
  const results = useWeather(place);

  const readings = Object.values(results).flatMap((r) => (r?.status === "ok" ? [r.reading] : []));
  const pending = Object.values(results).some((r) => r?.status === "loading");
  const verdict = readings.length ? getVerdict(readings) : undefined;
  const restOfDay = verdict ? getRestOfDay(readings, verdict.utcOffset) : [];
  const argues = readings.length > 1 && (verdict?.spread ?? 0) >= 0.5;
  const name = place.name ?? verdict?.place ?? "her";

  const locationButton = (
    <button
      type="button"
      onClick={() => setDialogOpen(true)}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-4 text-sm font-semibold hover:bg-ink hover:text-paper"
    >
      <svg
        className="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      {place === SKI ? "Ikke i Ski?" : "Bytt sted"}
    </button>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col overflow-x-hidden px-5 pt-5 pb-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-extrabold tracking-widest uppercase">Været i {name}</h1>
        {locationButton}
      </header>

      <nav className="mt-4 grid grid-cols-2 rounded-full border-2 border-ink p-1 text-sm font-extrabold uppercase">
        {TABS.map((tab) => (
          <a
            key={tab.view}
            href={tab.href}
            aria-current={view === tab.view ? "page" : undefined}
            className={`flex min-h-9 items-center justify-center rounded-full ${
              view === tab.view ? "bg-ink text-paper" : "hover:bg-ink/10"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <LocationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPick={setPlace}
        home={place === SKI ? undefined : SKI}
      />

      {view === "long" && <LongTerm coords={place} />}

      {view === "now" && !verdict && (
        <p className="font-display my-auto py-24 text-center text-3xl uppercase">
          {pending ? "Spør meteorologene…" : "Ingen vil si noe om været. Typisk."}
        </p>
      )}

      {view === "now" && verdict && (
        <>
          <div className="mt-2 flex items-start gap-2">
            <p className="font-display min-w-0 text-[clamp(6rem,40vw,11.5rem)] leading-[0.9] tracking-[-0.06em] tabular-nums">
              {Math.round(verdict.temp)}°
            </p>
            <div className="mt-6 ml-auto flex size-24 shrink-0 animate-wobble items-center justify-center rounded-full bg-ink text-paper sm:size-30">
              <WeatherIcon condition={verdict.condition} className="size-16 sm:size-20" />
            </div>
          </div>

          <p className="font-display mt-3 text-[clamp(2.25rem,11vw,3.5rem)] leading-[0.95] tracking-tight text-balance uppercase">
            Det er {verdict.description} for faen!
          </p>
          <p className="mt-2.5 text-lg font-semibold">{tempQuip(verdict.temp)}</p>

          <dl className="mt-5 grid grid-cols-3 border-y-2 border-ink">
            <div className="py-2.5">
              <dt className="text-xs font-semibold">Vind</dt>
              <dd className="text-lg font-extrabold tabular-nums">
                {verdict.windSpeed.toFixed(1).replace(".", ",")} m/s
              </dd>
              <dd className="text-xs">{windQuip(verdict.windSpeed)}</dd>
            </div>
            <div className="border-l-2 border-ink py-2.5 pl-3">
              <dt className="text-xs font-semibold">Sola opp</dt>
              <dd className="text-lg font-extrabold tabular-nums">{time(verdict.sunrise)}</dd>
            </div>
            <div className="border-l-2 border-ink py-2.5 pl-3">
              <dt className="text-xs font-semibold">Sola ned</dt>
              <dd className="text-lg font-extrabold tabular-nums">{time(verdict.sunset)}</dd>
            </div>
          </dl>

          <RestOfDay hours={restOfDay} utcOffset={verdict.utcOffset} />

          {readings.length > 1 && (
            <section className="mt-5 -rotate-[1.2deg] bg-ink p-4 text-paper">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-xl uppercase">Krangelmeter</h2>
                <p className="text-sm font-semibold tabular-nums">
                  {verdict.spread.toFixed(1).replace(".", ",")}° uenighet
                </p>
              </div>
              <Krangelmeter readings={readings} />
              <p className="mt-2 font-extrabold">{argumentQuip(verdict.spread, readings.length)}</p>
            </section>
          )}
        </>
      )}

      {view === "now" && (
        <ul className="mt-5">
          {SOURCES.map((source) => {
            const r = results[source.id] ?? { status: "loading" };
            if (r.status !== "ok") return <SourceCard key={source.id} source={source} {...r} />;
            const badge = !argues
              ? undefined
              : r.reading === verdict?.coldest
                ? "pessimisten"
                : r.reading === verdict?.warmest
                  ? "optimisten"
                  : undefined;
            return (
              <SourceCard
                key={source.id}
                source={source}
                status="ok"
                reading={r.reading}
                badge={badge}
              />
            );
          })}
        </ul>
      )}

      <footer className="mt-auto pt-8 text-xs opacity-70">
        {view === "now"
          ? "Data fra MET Norway (Yr), OpenWeather og Open-Meteo"
          : "Data fra MET Norway (Yr) og ECMWF, GFS og ICON via Open-Meteo"}
      </footer>
    </main>
  );
}
