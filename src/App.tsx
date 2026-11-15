import { useEffect, useState } from "react";
import { Krangelmeter } from "./components/Krangelmeter";
import { SourceCard } from "./components/SourceCard";
import { WeatherIcon } from "./components/WeatherIcon";
import { SOURCES, type Coords, type Reading, type SourceId } from "./sources";
import { argumentQuip, getVerdict, GIF_QUERY, tempQuip, windQuip } from "./verdict";

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

function useGif(query: string | undefined) {
  const [gif, setGif] = useState<string>();
  useEffect(() => {
    const key = import.meta.env.VITE_GIPHY_KEY;
    if (!query || !key) return;
    const ctrl = new AbortController();
    const offset = Math.floor(Math.random() * 10);
    fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=1&offset=${offset}&rating=pg-13`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then(({ data }) => setGif(data?.[0]?.images?.looping?.mp4))
      .catch(() => {});
    return () => ctrl.abort();
  }, [query]);
  return gif;
}

export default function App() {
  const [place, setPlace] = useState<Coords & { name?: string }>(SKI);
  const [locating, setLocating] = useState(false);
  const results = useWeather(place);

  const readings = Object.values(results).flatMap((r) => (r?.status === "ok" ? [r.reading] : []));
  const pending = Object.values(results).some((r) => r?.status === "loading");
  const verdict = readings.length ? getVerdict(readings) : undefined;
  const gif = useGif(verdict && GIF_QUERY[verdict.condition]);
  const argues = readings.length > 1 && (verdict?.spread ?? 0) >= 0.5;
  const name = place.name ?? verdict?.place ?? "her";

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setPlace({ lat: coords.latitude, lon: coords.longitude });
      },
      () => setLocating(false),
      { maximumAge: 10 * 60_000 },
    );
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {gif && (
        <video
          key={gif}
          className="fixed inset-0 size-full object-cover"
          src={gif}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {!gif && (
        <div className="fixed inset-0 bg-gradient-to-br from-sky-200 via-indigo-200 to-rose-200 dark:from-slate-900 dark:via-indigo-950 dark:to-rose-950" />
      )}

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 py-10">
        <section className="w-full rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-neutral-900">
          <h1 className="text-xl font-semibold sm:text-2xl">Hvordan er været i {name}?</h1>

          {!verdict && (
            <p className="py-16 text-lg text-neutral-500">
              {pending ? "Spør meteorologene…" : "Ingen vil si noe om været. Typisk."}
            </p>
          )}

          {verdict && (
            <>
              <div className="flex items-center justify-center gap-2">
                <WeatherIcon
                  condition={verdict.condition}
                  className="size-24 animate-wobble sm:size-28"
                />
                <p className="font-display text-[7rem] leading-none font-extrabold tabular-nums sm:text-[9rem]">
                  {Math.round(verdict.temp)}
                  <span className="font-normal">°</span>
                </p>
              </div>
              <p className="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
                Det er {verdict.description} for faen!
              </p>
              <p className="mt-2 text-neutral-500">{tempQuip(verdict.temp)}</p>

              <dl className="mt-6 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-neutral-500">Vind</dt>
                  <dd className="font-semibold tabular-nums">{verdict.windSpeed.toFixed(1)} m/s</dd>
                  <dd className="text-xs text-neutral-500">{windQuip(verdict.windSpeed)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Soloppgang</dt>
                  <dd className="flex items-center justify-center gap-1 font-semibold tabular-nums">
                    <img src="/sunup.svg" alt="" className="size-4 dark:invert" />
                    {time(verdict.sunrise)}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Solnedgang</dt>
                  <dd className="flex items-center justify-center gap-1 font-semibold tabular-nums">
                    <img src="/sunup.svg" alt="" className="size-4 rotate-180 dark:invert" />
                    {time(verdict.sunset)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>

        {verdict && readings.length > 1 && (
          <section className="w-full rounded-3xl bg-white/90 p-5 shadow-xl backdrop-blur dark:bg-neutral-900/85">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold">Krangelmeter</h2>
              <p className="text-sm text-neutral-500 tabular-nums">
                {verdict.spread.toFixed(1)}° uenighet
              </p>
            </div>
            <Krangelmeter readings={readings} />
            <p className="mt-2 text-center text-sm font-semibold">
              {argumentQuip(verdict.spread, readings.length)}
            </p>
          </section>
        )}

        <div className="flex w-full gap-3">
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
        </div>

        <footer className="flex flex-col items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
          {place === SKI ? (
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold shadow hover:bg-white disabled:opacity-60 dark:bg-neutral-900/85"
            >
              {locating ? "Leter…" : "Jeg er ikke i Ski 📍"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPlace(SKI)}
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold shadow hover:bg-white dark:bg-neutral-900/85"
            >
              Tilbake til Ski
            </button>
          )}
          <p className="rounded-full bg-white/70 px-3 py-1 backdrop-blur dark:bg-neutral-900/70">
            Data fra MET Norway (Yr), OpenWeather og Open-Meteo · GIF-er fra Giphy
          </p>
        </footer>
      </main>
    </div>
  );
}
