"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import PageHeader from "@/components/PageHeader";
import { useSession } from "@/components/AppShell";
import type { AdminUser, Role } from "@/lib/types";

type Notice = { text: string; isError: boolean } | null;

export default function UsersPage() {
  const { user } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [role, setRole] = useState<Role>("user");

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const body = await res.json();
    if (!res.ok) {
      setNotice({ text: body.message ?? "Could not load users.", isError: true });
      return;
    }
    setUsers(body as AdminUser[]);
  }, []);

  useEffect(() => {
    if (user.role === "admin") loadUsers();
  }, [user.role, loadUsers]);

  if (user.role !== "admin") {
    return (
      <>
        <PageHeader title="Users" />
        <section className="card">
          <p className="muted">Only administrators can manage users.</p>
        </section>
      </>
    );
  }

  const update = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role }),
    });
    const body = await res.json();
    if (!res.ok) {
      setNotice({ text: body.message ?? "Could not create the user.", isError: true });
      return;
    }

    setForm({ username: "", email: "", password: "" });
    setRole("user");
    setNotice({ text: "User created successfully.", isError: false });
    await loadUsers();
  }

  async function handleDelete(target: AdminUser) {
    if (!confirm(`Delete user "${target.username}"? Their saved cities will also be deleted.`)) return;

    const res = await fetch(`/api/users/${target.id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      setNotice({ text: body.message ?? "Could not delete the user.", isError: true });
      return;
    }
    setNotice({ text: `Deleted ${target.username}.`, isError: false });
    await loadUsers();
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Create accounts and remove users. Only administrators can add users."
      />

      <section className="card">
        <h2 className="card__title" style={{ marginBottom: 16 }}>Create a user</h2>
        <form className="form" onSubmit={handleCreate} noValidate>
          <div className="form-row">
            <label className="field">
              <span>Username</span>
              <input value={form.username} onChange={update("username")}
                minLength={3} maxLength={50} placeholder="e.g. weatheruser" required />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Email (optional)</span>
            <input type="email" value={form.email} onChange={update("email")}
              maxLength={254} placeholder="user@example.com" />
          </label>
          <label className="field">
            <span>Temporary password (12+ characters)</span>
            <input type="password" value={form.password} onChange={update("password")}
              minLength={12} required />
          </label>
          <button type="submit" className="btn--block">Create user</button>
          {notice && (
            <p className={`alert${notice.isError ? " alert--error" : ""}`} role="alert">
              {notice.text}
            </p>
          )}
        </form>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">Existing users</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={loadUsers}>
            Refresh
          </button>
        </div>
        <ul className="users-list">
          {users.map((row) => (
            <li key={row.id} className="user-item">
              <div className="user-identity">
                <div className="avatar">{row.username.charAt(0).toUpperCase()}</div>
                <div className="user-identity__text">
                  <strong>{row.username}</strong>
                  <span className="muted">
                    {row.role}{row.email ? ` · ${row.email}` : ""}
                  </span>
                </div>
              </div>
              {row.id === user.id ? (
                <span className="pill">You</span>
              ) : (
                <button type="button" className="btn btn--ghost btn--small btn--danger"
                  onClick={() => handleDelete(row)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}