# Hvordan er været for faen

A weather app that asks three weather services about the weather and lets them argue about it.

- **Yr** (MET Norway), no key needed
- **OpenWeather**, needs `VITE_OPENWEATHER_KEY`
- **Open-Meteo**, no key needed

The sources vote on the weather (a tie goes to the worst weather) and average the temperature.
The Krangelmeter shows how much they disagree. The coldest source is labelled the pessimist,
the warmest the optimist.

## Develop

Uses [Vite+](https://viteplus.dev) and pnpm.

```sh
cp .env.example .env.local   # add keys; sources without a key are skipped
vp install
vp dev
vp check                     # format, lint, type check
vp build
```
