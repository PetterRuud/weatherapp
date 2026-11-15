import type { Reading, Source } from "../sources";
import { sourceDot } from "./Krangelmeter";

type Props = { source: Source } & (
  | { status: "ok"; reading: Reading; badge?: string }
  | { status: "loading" }
  | { status: "error"; message: string }
);

/** One row in the source list: name, an optional pessimist/optimist tag, and the temperature. */
export function SourceCard(props: Props) {
  const { source } = props;
  return (
    <li className="flex min-h-12 items-center gap-2.5 border-b border-ink/35 py-2 last:border-b-0">
      <span className={`size-2.5 shrink-0 rounded-full ${sourceDot(source.id)}`} />
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="font-semibold hover:underline"
      >
        {source.name}
      </a>

      {props.status === "ok" && props.badge && (
        <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-extrabold text-paper">
          {props.badge}
        </span>
      )}

      {props.status === "loading" && <span className="ml-auto animate-pulse text-sm">tenker…</span>}

      {props.status === "error" && (
        <span className="ml-auto truncate text-sm opacity-70">{props.message}</span>
      )}

      {props.status === "ok" && (
        <span className="ml-auto flex items-baseline gap-2">
          <span className="hidden text-sm sm:inline">{props.reading.description}</span>
          <span className="font-display text-xl tabular-nums">
            {Math.round(props.reading.temp)}°
          </span>
        </span>
      )}
    </li>
  );
}
