"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ActivityList from "@/components/ActivityList";
import type { SavedCity } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useSession();
  const [cities, setCities] = useState<SavedCity[] | null>(null);

  useEffect(() => {
    fetch("/api/cities")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SavedCity[]) => setCities(data))
      .catch(() => setCities([]));
  }, []);

  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        eyebrow={`${part}, ${user.username}`}
        title="Dashboard"
        description="Your weather overview at a glance."
      />

      <div className="stats">
        <div className="stat">
          <span className="stat__label">Saved cities</span>
          <strong className="stat__value">{cities ? cities.length : "—"}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Role</span>
          <strong className="stat__value">{user.role === "admin" ? "Administrator" : "User"}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Email</span>
          <strong className="stat__value">{user.email ?? "Not set"}</strong>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Saved cities</h2>
            <Link href="/weather" className="btn btn--ghost btn--small">Check weather</Link>
          </div>

          {cities === null ? (
            <p className="muted">Loading…</p>
          ) : cities.length === 0 ? (
            <p className="muted">Nothing saved yet. Search for a city on the Weather page to get started.</p>
          ) : (
            <ul className="saved-list">
              {cities.slice(0, 6).map((city) => (
                <li key={city.id} className="saved-item">
                  <span className="saved-item__name">📍 {city.city}</span>
                  {city.note && <span className="muted">{city.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Recent activity</h2>
            <Link href="/activity" className="btn btn--ghost btn--small">View all</Link>
          </div>
          <ActivityList limit={5} />
        </section>
      </div>
    </>
  );
}