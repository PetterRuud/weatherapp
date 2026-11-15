import type { Reading, Source } from "../sources";
import { sourceDot } from "./Krangelmeter";
import { WeatherIcon } from "./WeatherIcon";

type Props = { source: Source } & (
  | { status: "ok"; reading: Reading; badge?: string }
  | { status: "loading" }
  | { status: "error"; message: string }
);

export function SourceCard(props: Props) {
  const { source } = props;
  return (
    <article className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl bg-white/90 p-4 text-center shadow-lg backdrop-blur dark:bg-neutral-900/85">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm font-semibold hover:underline"
      >
        <span className={`size-2.5 rounded-full ${sourceDot(source.id)}`} />
        {source.name}
      </a>

      {props.status === "loading" && (
        <p className="py-6 text-sm text-neutral-500 animate-pulse">tenker…</p>
      )}

      {props.status === "error" && (
        <p className="py-4 text-sm text-neutral-500">
          <span className="block text-2xl">🤷</span>
          {props.message}
        </p>
      )}

      {props.status === "ok" && (
        <>
          <WeatherIcon condition={props.reading.condition} className="my-1 size-14" />
          <p className="font-display text-3xl font-extrabold tabular-nums">
            {Math.round(props.reading.temp)}°
          </p>
          <p className="text-sm leading-tight text-neutral-600 dark:text-neutral-300">
            {props.reading.description}
          </p>
          {props.badge && (
            <p className="mt-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
              {props.badge}
            </p>
          )}
        </>
      )}
    </article>
  );
}
