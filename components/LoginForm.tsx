"use client";

import { useState, type FormEvent } from "react";
import type { SessionUser } from "@/lib/types";

interface LoginFormProps {
  onLogin: (user: SessionUser) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Sign in failed.");
      onLogin(body.user as SessionUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <div className="brand">
        <span aria-hidden="true">⛅</span>
        <span>Mini Weather</span>
      </div>
      <h1>Welcome back</h1>
      <p className="muted">Sign in with your username and password.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={50}
            placeholder="Your username"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            required
          />
        </label>
        <button type="submit" className="btn--block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
      </form>
    </div>
  );
}