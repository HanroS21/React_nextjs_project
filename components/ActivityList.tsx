"use client";

import { useEffect, useState } from "react";
import { describeAudit } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

interface ActivityListProps {
  limit?: number;
}

export default function ActivityList({ limit }: ActivityListProps) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/audit")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message ?? "Could not load activity.");
        setEntries(body as AuditEntry[]);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load activity.")
      );
  }, []);

  if (error) return <p className="alert alert--error" role="alert">{error}</p>;
  if (entries === null) return <p className="muted">Loading…</p>;
  if (entries.length === 0) return <p className="muted">No activity yet.</p>;

  const shown = limit ? entries.slice(0, limit) : entries;

  return (
    <ol className="activity-list">
      {shown.map((entry) => (
        <li key={entry.id} className="activity-item">
          <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
          <span>
            {entry.user_email}: {describeAudit(entry)}
          </span>
        </li>
      ))}
    </ol>
  );
}