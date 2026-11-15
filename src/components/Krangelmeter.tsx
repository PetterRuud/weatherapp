import type { Reading } from "../sources";
import { SOURCES } from "../sources";

const DOT: Record<string, string> = {
  yr: "bg-sky-500",
  openweather: "bg-orange-500",
  openmeteo: "bg-emerald-500",
};

/** A thermometer where each source gets a dot. The further apart, the louder the argument. */
export function Krangelmeter({ readings }: { readings: Reading[] }) {
  const temps = readings.map((r) => r.temp);
  const min = Math.floor(Math.min(...temps)) - 1;
  const max = Math.ceil(Math.max(...temps)) + 1;
  const pos = (t: number) => ((t - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full bg-gradient-to-r from-sky-300 via-amber-200 to-rose-400">
        {readings.map((r, i) => (
          <span
            key={r.source}
            title={`${SOURCES.find((s) => s.id === r.source)?.name}: ${r.temp.toFixed(1)}°`}
            className={`absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-[left] duration-700 ${DOT[r.source]}`}
            style={{ left: `${pos(r.temp)}%`, zIndex: i + 1 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-neutral-500 tabular-nums">
        <span>{min}°</span>
        <span>{max}°</span>
      </div>
    </div>
  );
}

export const sourceDot = (id: string) => DOT[id] ?? "bg-neutral-400";
