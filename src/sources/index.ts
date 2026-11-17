import { openmeteo } from "./openmeteo";
import { openweather } from "./openweather";
import type { Forecaster, Source } from "./types";
import { yr } from "./yr";

export const SOURCES: Source[] = [yr, openweather, openmeteo];

/** Who argues on the long term page. The three models arrive through Open-Meteo. */
export const FORECASTERS: Forecaster[] = [
  { id: "yr", name: "Yr", url: "https://www.yr.no" },
  { id: "ecmwf", name: "ECMWF", url: "https://www.ecmwf.int" },
  { id: "gfs", name: "GFS", url: "https://www.ncei.noaa.gov/products/weather-climate-models" },
  { id: "icon", name: "ICON", url: "https://www.dwd.de" },
];

export { fetchModelDays } from "./openmeteo";
export { fetchTimeline, yrDays, type Timestep } from "./yr";
export * from "./types";
