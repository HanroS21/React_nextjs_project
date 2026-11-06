"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import LoginForm from "./LoginForm";
import NavBar from "./NavBar";
import type { SessionUser } from "@/lib/types";

type Theme = "light" | "dark";

interface SessionValue {
  user: SessionUser;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <AppShell>.");
  return value;
}

// Reads the theme already applied by the script in layout.tsx.
function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SessionUser | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("mw.theme", next);
  };

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div className="login-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-page">
        <LoginForm onLogin={setUser} />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, signOut }}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span aria-hidden="true">⛅</span>
            <span>Mini Weather</span>
          </div>

          <NavBar isAdmin={user.role === "admin"} />

          <div className="sidebar__foot">
            <p className="sidebar__user">{user.username}</p>
            {user.role === "admin" && <span className="role-badge">Administrator</span>}
            <div className="sidebar__actions">
              <button type="button" className="btn btn--ghost btn--small" onClick={toggleTheme}>
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
              <button type="button" className="btn btn--ghost btn--small" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="main">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}