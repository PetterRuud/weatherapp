import { openmeteo } from "./openmeteo";
import { openweather } from "./openweather";
import type { Source } from "./types";
import { yr } from "./yr";

export const SOURCES: Source[] = [yr, openweather, openmeteo];
export * from "./types";
