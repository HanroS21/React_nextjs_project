"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "@/lib/types";

interface LoginFormProps {
  onLogin: (user: SessionUser) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => (res.ok ? res.json() : { needsSetup: false }))
      .then((data: { needsSetup: boolean }) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (needsSetup && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(needsSetup ? "/api/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = (await res.json().catch(() => ({}))) as { user?: SessionUser; message?: string };
      if (!res.ok || !body.user) throw new Error(body.message ?? "Something went wrong.");
      onLogin(body.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <div className="brand">
        <span aria-hidden="true">⛅</span>
        <span>Mini Weather</span>
      </div>
      <h1>{needsSetup ? "Create the first administrator" : "Welcome back"}</h1>
      <p className="muted">
        {needsSetup
          ? "No accounts exist yet. The account you create here becomes the administrator."
          : "Sign in with your username and password."}
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={50}
            required
          />
        </label>
        <label className="field">
          <span>{needsSetup ? "Password (12+ characters)" : "Password"}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={needsSetup ? "new-password" : "current-password"}
            required
          />
        </label>
        {needsSetup && (
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        )}
        <button type="submit" className="btn--block" disabled={busy}>
          {busy ? "Please wait…" : needsSetup ? "Create administrator" : "Sign in"}
        </button>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
      </form>
    </div>
  );
}