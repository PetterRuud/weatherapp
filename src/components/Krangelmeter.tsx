import type { Reading } from "../sources";
import { SOURCES } from "../sources";

const DOT: Record<string, string> = {
  yr: "bg-sky-500",
  openweather: "bg-orange-500",
  openmeteo: "bg-emerald-500",
  ecmwf: "bg-violet-500",
  gfs: "bg-rose-500",
  icon: "bg-lime-400",
};

/** A thermometer where each source gets a dot. The further apart, the louder the argument. */
export function Krangelmeter({ readings }: { readings: Reading[] }) {
  const temps = readings.map((r) => r.temp);
  const min = Math.floor(Math.min(...temps)) - 1;
  const max = Math.ceil(Math.max(...temps)) + 1;
  const pos = (t: number) => ((t - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="relative mt-5 mb-2 h-2.5 bg-paper">
        {readings.map((r, i) => (
          <span
            key={r.source}
            title={`${SOURCES.find((s) => s.id === r.source)?.name}: ${r.temp.toFixed(1)}°`}
            className={`absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink transition-[left] duration-700 ${DOT[r.source]}`}
            style={{ left: `${pos(r.temp)}%`, zIndex: i + 1 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs font-semibold tabular-nums opacity-70">
        <span>{min}°</span>
        <span>{max}°</span>
      </div>
    </div>
  );
}

export const sourceDot = (id: string) => DOT[id] ?? "bg-neutral-400";
