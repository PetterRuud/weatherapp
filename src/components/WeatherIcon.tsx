import type { Condition } from "../sources";
import rain from "../icons/rain.svg?raw";
import snow from "../icons/snow.svg?raw";
import sun from "../icons/sun.svg?raw";
import suncloud from "../icons/suncloud.svg?raw";
import thunder from "../icons/thunder.svg?raw";
import windy from "../icons/windy.svg?raw";

const ICONS: Record<Condition, string> = {
  clear: sun,
  partly: suncloud,
  cloudy: windy,
  fog: windy,
  wind: windy,
  rain,
  snow,
  thunder,
};

/** The SVGs are inlined so the keyframes in icons.css can animate their parts. */
export function WeatherIcon({
  condition,
  className = "",
}: {
  condition: Condition;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={condition}
      className={`wx-icon inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: ICONS[condition] }}
    />
  );
}
