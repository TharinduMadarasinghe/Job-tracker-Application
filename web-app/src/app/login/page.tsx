"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ token: string }>(`/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("token", res.token);
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white md:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18v13H3zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18" />
            </svg>
          </span>
          Job Tracker
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Every application,<br />one clear view.</h2>
          <ul className="mt-6 space-y-3 text-indigo-100">
            <li>• Track status from applied to offer</li>
            <li>• Search and filter in seconds</li>
            <li>• Same data on web and mobile</li>
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Laravel · Next.js · React Native · SQL Server</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="pop w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login" ? "Log in to see your applications." : "Start tracking your job search."}
            </p>
          </div>

          {mode === "register" && (
            <input required className={input} placeholder="Full name"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          )}
          <input required type="email" className={input} placeholder="Email address"
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="password" className={input} placeholder="Password (min 6 characters)"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
          )}

          <button disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            {mode === "login" ? "No account yet?" : "Already registered?"}{" "}
            <button type="button" className="font-medium text-indigo-600 hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Register" : "Log in"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
