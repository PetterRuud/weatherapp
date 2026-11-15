import { useEffect, useRef, useState } from "react";
import { getJson, type Coords } from "../sources";

export type Place = Coords & { name?: string };

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

type Search =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; results: GeoResult[] }
  | { status: "error" };

function usePlaceSearch(query: string): Search {
  const [search, setSearch] = useState<Search>({ status: "idle" });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    setSearch({ status: "loading" });
    // Small debounce so we don't hit the API on every keystroke.
    const timer = setTimeout(() => {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=nb&format=json`;
      getJson<{ results?: GeoResult[] }>(url, ctrl.signal)
        .then((data) => setSearch({ status: "ok", results: data.results ?? [] }))
        .catch(() => {
          if (!ctrl.signal.aborted) setSearch({ status: "error" });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return search;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (place: Place) => void;
  /** Shown as a shortcut back to the default place when we're elsewhere. */
  home?: Place & { name: string };
}

export function LocationDialog({ open, onClose, onPick, home }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const search = usePlaceSearch(query);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setGeoError(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const pick = (place: Place) => {
    onPick(place);
    onClose();
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        pick({ lat: coords.latitude, lon: coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { maximumAge: 10 * 60_000 },
    );
  };

  const pill =
    "flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-ink px-4 text-sm font-semibold hover:bg-ink hover:text-paper disabled:opacity-60";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="location-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] border-2 border-ink bg-paper p-0 text-ink backdrop:bg-black/60"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="location-title" className="font-display text-2xl uppercase">
            Hvor er du?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="flex size-11 items-center justify-center rounded-full text-2xl leading-none hover:bg-ink hover:text-paper"
          >
            ×
          </button>
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (search.status === "ok" && search.results[0]) {
              const r = search.results[0];
              pick({ lat: r.latitude, lon: r.longitude, name: r.name });
            }
          }}
        >
          <label htmlFor="place-search" className="text-xs font-semibold">
            Søk etter sted
          </label>
          <input
            id="place-search"
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="F.eks. Bergen"
            className="mt-1 min-h-11 w-full border-2 border-ink bg-transparent px-3 text-lg font-semibold placeholder:text-ink/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          />
        </form>

        <div className="mt-2 min-h-6" aria-live="polite">
          {search.status === "loading" && <p className="text-sm">Leter…</p>}
          {search.status === "error" && <p className="text-sm">Søket feilet. Prøv igjen.</p>}
          {search.status === "ok" && search.results.length === 0 && (
            <p className="text-sm">Fant ingen steder som heter det.</p>
          )}
          {search.status === "ok" && search.results.length > 0 && (
            <ul className="divide-y-2 divide-ink border-y-2 border-ink">
              {search.results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick({ lat: r.latitude, lon: r.longitude, name: r.name })}
                    className="flex min-h-11 w-full flex-col items-start px-2 py-2 text-left hover:bg-ink hover:text-paper"
                  >
                    <span className="font-extrabold">{r.name}</span>
                    <span className="text-xs">
                      {[r.admin1, r.country].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={locate} disabled={locating} className={pill}>
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
            {locating ? "Finner deg…" : "Bruk min posisjon"}
          </button>
          {home && (
            <button type="button" onClick={() => pick(home)} className={pill}>
              Tilbake til {home.name}
            </button>
          )}
        </div>
        {geoError && <p className="mt-2 text-sm">Fikk ikke tak i posisjonen din. Søk i stedet.</p>}
      </div>
    </dialog>
  );
}
