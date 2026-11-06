"use client";

import { useState } from "react";
import type { SavedCity } from "@/lib/types";

interface SavedCitiesProps {
  cities: SavedCity[];
  onSelect: (city: string) => void;
  onChanged: () => Promise<void>;
}

export default function SavedCities({ cities, onSelect, onChanged }: SavedCitiesProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  async function saveNote(city: SavedCity) {
    setError("");
    const res = await fetch(`/api/cities/${city.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: draft }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.message ?? "Could not save the note.");
      return;
    }
    setEditingId(null);
    await onChanged();
  }

  async function removeCity(city: SavedCity) {
    if (!confirm(`Delete ${city.city} from your saved cities?`)) return;
    setError("");
    const res = await fetch(`/api/cities/${city.id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.message ?? "Could not delete the city.");
      return;
    }
    await onChanged();
  }

  return (
    <section className="card" aria-labelledby="saved-title">
      <div className="card__head">
        <h2 id="saved-title" className="card__title">Saved cities</h2>
        {cities.length > 0 && <span className="pill">{cities.length}</span>}
      </div>

      {cities.length === 0 ? (
        <p className="muted">Nothing saved yet. Search for a city, then choose &quot;Save this city&quot;.</p>
      ) : (
        <ul className="saved-list">
          {cities.map((city) => (
            <li key={city.id} className="saved-item">
              <div className="saved-item__row">
                <button type="button" className="link-button" onClick={() => onSelect(city.city)}>
                  📍 {city.city}
                </button>
                {editingId !== city.id && (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => {
                        setEditingId(city.id);
                        setDraft(city.note);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small btn--danger"
                      onClick={() => removeCity(city)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingId === city.id ? (
                <div className="note-edit">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNote(city);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    maxLength={200}
                    placeholder="Add a note"
                    aria-label={`Note for ${city.city}`}
                    autoFocus
                  />
                  <div className="row-actions">
                    <button type="button" className="btn btn--small" onClick={() => saveNote(city)}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                city.note && <p className="muted">{city.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="alert alert--error" role="alert">{error}</p>}
    </section>
  );
}