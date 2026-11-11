"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "@/lib/types";

interface LoginFormProps {
  onLogin: (user: SessionUser) => void;
}

interface ApiReply {
  res: Response;
  body: { user?: SessionUser; message?: string };
}

async function post(url: string, payload: unknown): Promise<ApiReply> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as ApiReply["body"];
  return { res, body };
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [unlockMode, setUnlockMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
    setInfo("");

    if (needsSetup && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (unlockMode) {
        const { res, body } = await post("/api/auth/unlock", {
          username: username.trim(),
          code: code.trim(),
        });
        if (!res.ok) throw new Error(body.message ?? "Could not unlock the account.");
        setUnlockMode(false);
        setCode("");
        setPassword("");
        setInfo(body.message ?? "Account unlocked. Sign in with your password.");
        return;
      }

      const url = needsSetup ? "/api/setup" : "/api/auth/login";
      const { res, body } = await post(url, { username: username.trim(), password });

      if (res.status === 423) {
        setUnlockMode(true);
        setError(body.message ?? "This account is locked.");
        return;
      }
      if (!res.ok || !body.user) throw new Error(body.message ?? "Something went wrong.");
      onLogin(body.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function requestNewCode() {
    setError("");
    setInfo("");
    if (!username.trim()) {
      setError("Enter your username first.");
      return;
    }
    try {
      const { body } = await post("/api/auth/request-code", { username: username.trim() });
      setInfo(body.message ?? "If this account is locked, a new code has been sent.");
    } catch {
      setError("Could not request a new code. Check your connection and try again.");
    }
  }

  const heading = needsSetup ? "Create the first administrator" : unlockMode ? "Account locked" : "Welcome back";
  const subtitle = needsSetup
    ? "No accounts exist yet. The account you create here becomes the administrator."
    : unlockMode
      ? "Enter the 6-digit code we emailed you. Codes expire after 10 minutes."
      : "Sign in with your username and password.";
  const buttonText = busy
    ? "Please wait…"
    : needsSetup
      ? "Create administrator"
      : unlockMode
        ? "Unlock account"
        : "Sign in";

  return (
    <div className="login-card">
      <div className="brand">
        <span aria-hidden="true">⛅</span>
        <span>Mini Weather</span>
      </div>
      <h1>{heading}</h1>
      <p className="muted">{subtitle}</p>

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

        {!unlockMode && (
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
        )}

        {!unlockMode && needsSetup && (
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

        {unlockMode && (
          <label className="field">
            <span>Unlock code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6 digits"
              required
            />
          </label>
        )}

        <button type="submit" className="btn--block" disabled={busy}>
          {buttonText}
        </button>

        {unlockMode && (
          <div className="row-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={requestNewCode}>
              Send a new code
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => {
                setUnlockMode(false);
                setError("");
              }}
            >
              Back to sign in
            </button>
          </div>
        )}

        {info && <p className="alert" role="status">{info}</p>}
        {error && <p className="alert alert--error" role="alert">{error}</p>}
      </form>
    </div>
  );
}