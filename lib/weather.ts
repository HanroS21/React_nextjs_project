import type { WeatherData } from "./types";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

// Checks that the outside response has the fields the weather card reads.
export function isWeatherData(value: unknown): value is WeatherData {
  if (!isObject(value)) return false;
  const sys = isObject(value.sys) ? value.sys : null;
  const main = isObject(value.main) ? value.main : null;
  const wind = isObject(value.wind) ? value.wind : null;
  const first = Array.isArray(value.weather) && isObject(value.weather[0]) ? value.weather[0] : null;

  return (
    typeof value.name === "string" &&
    !!sys && typeof sys.country === "string" &&
    !!main &&
    ["temp", "feels_like", "temp_min", "temp_max", "humidity", "pressure"].every(
      (key) => typeof main[key] === "number"
    ) &&
    !!wind && typeof wind.speed === "number" &&
    !!first &&
    typeof first.main === "string" &&
    typeof first.description === "string" &&
    typeof first.icon === "string"
  );
}