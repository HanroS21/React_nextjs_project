"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import PageHeader from "@/components/PageHeader";
import { useSession } from "@/components/AppShell";

type Notice = { text: string; isError: boolean } | null;

export default function AccountPage() {
  const { user, signOut } = useSession();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.newPassword.length < 12) {
      setNotice({ text: "New password must be at least 12 characters.", isError: true });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setNotice({ text: "The new passwords do not match.", isError: true });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Could not change your password.");

      setNotice({ text: "Password changed. Signing you out…", isError: false });
      setTimeout(() => void signOut(), 1500);
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : "Could not change your password.",
        isError: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Account"
        description={`Signed in as ${user.username}. Change the password you use to sign in.`}
      />

      <section className="card">
        <h2 className="card__title" style={{ marginBottom: 16 }}>Change password</h2>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Current password</span>
            <input type="password" autoComplete="current-password"
              value={form.currentPassword} onChange={update("currentPassword")} required />
          </label>
          <label className="field">
            <span>New password (12+ characters)</span>
            <input type="password" autoComplete="new-password"
              value={form.newPassword} onChange={update("newPassword")} required />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input type="password" autoComplete="new-password"
              value={form.confirmPassword} onChange={update("confirmPassword")} required />
          </label>
          <button type="submit" className="btn--block" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
          {notice && (
            <p className={`alert${notice.isError ? " alert--error" : ""}`} role="alert">
              {notice.text}
            </p>
          )}
        </form>
      </section>
    </>
  );
}