"use client";

import { useEffect, useState, type FormEvent } from "react";
import PageHeader from "@/components/PageHeader";
import WeatherCard from "@/components/WeatherCard";
import SavedCities from "@/components/SavedCities";
import type { SavedCity, WeatherData } from "@/lib/types";

export default function WeatherPage() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [saved, setSaved] = useState<SavedCity[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshSaved() {
    const res = await fetch("/api/cities");
    if (res.ok) setSaved(await res.json());
  }

  useEffect(() => {
    refreshSaved().catch(() => setStatus("Could not load your saved cities."));
  }, []);

  async function search(name: string) {
    const query = name.trim();
    if (!query) return;

    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Weather request failed.");
      setWeather(body as WeatherData);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(city);
  }

  async function saveCity() {
    if (!weather) return;
    const res = await fetch("/api/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: weather.name }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStatus(body.message ?? "Could not save this city.");
      return;
    }
    await refreshSaved();
  }

  const alreadySaved =
    weather !== null && saved.some((c) => c.city.toLowerCase() === weather.name.toLowerCase());

  return (
    <>
      <PageHeader
        title="Weather"
        description="Search any city for current conditions, then save the places you check often."
      />

      <form className="search" role="search" onSubmit={handleSubmit}>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search a city, e.g. Johannesburg"
          aria-label="City"
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {status && <p className="alert alert--error" role="alert">{status}</p>}

      {weather ? (
        <WeatherCard data={weather} saved={alreadySaved} onSave={saveCity} />
      ) : (
        <div className="empty">
          <div className="empty__icon" aria-hidden="true">🌦️</div>
          <h3>Check the weather anywhere</h3>
          <p>Search for a city to see its current conditions.</p>
        </div>
      )}

      <SavedCities
        cities={saved}
        onSelect={(name) => {
          setCity(name);
          search(name);
        }}
        onChanged={refreshSaved}
      />
    </>
  );
}