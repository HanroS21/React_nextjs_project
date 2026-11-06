"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/lib/types";

interface WeatherCardProps {
  data: WeatherData;
  saved: boolean;
  onSave: () => void;
}

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", timeZone: "UTC" };
const DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" };

// Current time in seconds, refreshed every 30 seconds. The cleanup stops the timer.
function useNowSeconds(): number {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Shows a UTC timestamp shifted to the city's local time.
const clockAt = (unix: number, offset: number) =>
  new Date((unix + offset) * 1000).toLocaleTimeString([], TIME);

function conditionKey(main: string): string {
  const value = main.toLowerCase();
  if (value === "clear") return "clear";
  if (value === "clouds") return "clouds";
  if (value === "rain" || value === "drizzle") return "rain";
  if (value === "thunderstorm") return "storm";
  if (value === "snow") return "snow";
  return "mist";
}

function compass(degrees: number): string {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(degrees / 22.5) % 16];
}

function daylightInfo(now: number, sunrise?: number, sunset?: number, offset = 0) {
  if (sunrise === undefined || sunset === undefined) {
    return { share: 0, label: "Daylight times unavailable", night: false };
  }
  const share = Math.min(1, Math.max(0, (now - sunrise) / (sunset - sunrise)));
  const night = now < sunrise || now > sunset;

  if (now < sunrise) return { share, label: `Sunrise at ${clockAt(sunrise, offset)}`, night };
  if (now > sunset) return { share, label: `Sunset was at ${clockAt(sunset, offset)}`, night };

  const left = sunset - now;
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  return { share, label: `${hours}h ${minutes}m of daylight left`, night };
}

export default function WeatherCard({ data, saved, onSave }: WeatherCardProps) {
  const now = useNowSeconds();
  const { name, sys, main, wind, weather, visibility, clouds, timezone } = data;
  const condition = weather[0];
  const offset = timezone ?? 0;
  const daylight = daylightInfo(now, sys.sunrise, sys.sunset, offset);

  return (
    <article
      className={`weather${daylight.night ? " is-night" : ""}`}
      data-condition={conditionKey(condition.main)}
    >
      <div className="weather__top">
        <div>
          <p className="weather__meta">{new Date((now + offset) * 1000).toLocaleDateString([], DATE)}</p>
          <h2 className="weather__place">{name}, {sys.country}</h2>
          <p className="weather__meta">{clockAt(now, offset)} local time</p>
        </div>
        <img
          className="weather__icon"
          src={`https://openweathermap.org/img/wn/${condition.icon}@2x.png`}
          alt={condition.description}
          width={110}
          height={110}
        />
      </div>

      <div className="weather__temp">
        <span>{Math.round(main.temp)}</span>
        <span>°C</span>
      </div>
      <p className="weather__desc">{condition.description}</p>

      <div className="weather__range">
        <span>Feels like {Math.round(main.feels_like)}°</span>
        <span>High {Math.round(main.temp_max)}°</span>
        <span>Low {Math.round(main.temp_min)}°</span>
      </div>

      <div className="weather__actions">
        <button type="button" className="btn" onClick={onSave} disabled={saved}>
          {saved ? "Saved" : "Save this city"}
        </button>
      </div>

      <section className="tiles" aria-label="Weather details">
        <div className="tile">
          <span className="tile__label">💧 Humidity</span>
          <strong className="tile__value">{main.humidity}%</strong>
        </div>
        <div className="tile">
          <span className="tile__label">💨 Wind</span>
          <strong className="tile__value">{Math.round(wind.speed * 3.6)} km/h</strong>
          {wind.deg !== undefined && <span className="tile__sub">From the {compass(wind.deg)}</span>}
        </div>
        <div className="tile">
          <span className="tile__label">🌡️ Pressure</span>
          <strong className="tile__value">{main.pressure} hPa</strong>
        </div>
        <div className="tile">
          <span className="tile__label">👁️ Visibility</span>
          <strong className="tile__value">
            {visibility !== undefined ? `${(visibility / 1000).toFixed(1)} km` : "—"}
          </strong>
        </div>
        <div className="tile">
          <span className="tile__label">☁️ Cloud cover</span>
          <strong className="tile__value">{clouds ? `${clouds.all}%` : "—"}</strong>
        </div>
        <div className="tile">
          <span className="tile__label">🌅 Sunrise</span>
          <strong className="tile__value">
            {sys.sunrise !== undefined ? clockAt(sys.sunrise, offset) : "—"}
          </strong>
        </div>
        <div className="tile">
          <span className="tile__label">🌇 Sunset</span>
          <strong className="tile__value">
            {sys.sunset !== undefined ? clockAt(sys.sunset, offset) : "—"}
          </strong>
        </div>
        <div className="tile tile--wide">
          <span className="tile__label">☀️ Daylight</span>
          <div className="daylight-track">
            <div className="daylight-fill" style={{ width: `${daylight.share * 100}%` }} />
          </div>
          <span className="tile__sub">{daylight.label}</span>
        </div>
      </section>
    </article>
  );
}