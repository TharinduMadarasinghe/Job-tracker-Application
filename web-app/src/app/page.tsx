"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Job, Stats, Status } from "@/lib/api";

const STATUSES: Status[] = ["applied", "interviewing", "offer", "rejected"];

const UI: Record<Status, { label: string; badge: string; dot: string; bar: string }> = {
  applied:      { label: "Applied",      badge: "bg-blue-50 text-blue-700 ring-blue-600/20",       dot: "bg-blue-500",    bar: "bg-blue-500" },
  interviewing: { label: "Interviewing", badge: "bg-amber-50 text-amber-700 ring-amber-600/20",    dot: "bg-amber-500",   bar: "bg-amber-500" },
  offer:        { label: "Offer",        badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  rejected:     { label: "Rejected",     badge: "bg-rose-50 text-rose-700 ring-rose-600/20",       dot: "bg-rose-500",    bar: "bg-rose-500" },
};

const AVATARS = [
  "bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700",
];

const EMPTY = { company: "", position: "", status: "applied" as Status, location: "", applied_date: "", notes: "" };

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}
const P = {
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  briefcase: "M3 7h18v13H3zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18",
  pin: "M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18",
  x: "M18 6L6 18M6 6l12 12",
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (filter) qs.set("status", filter);
      const [list, s] = await Promise.all([
        api<{ data: Job[] }>(`/applications?${qs.toString()}`),
        api<Stats>("/applications/stats"),
      ]);
      setJobs(list.data);
      setStats(s);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filter, router]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, router]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setOpen(true);
  }

  function openEdit(j: Job) {
    setEditingId(j.id);
    setForm({
      company: j.company,
      position: j.position,
      status: j.status,
      location: j.location ?? "",
      applied_date: j.applied_date?.slice(0, 10) ?? "",
      notes: j.notes ?? "",
    });
    setFormError("");
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(editingId ? `/applications/${editingId}` : "/applications", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setOpen(false);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: number, status: Status) {
    await api(`/applications/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this application?")) return;
    await api(`/applications/${id}`, { method: "DELETE" });
    load();
  }

  async function logout() {
    try { await api("/logout", { method: "POST" }); } catch {}
    localStorage.removeItem("token");
    router.push("/login");
  }

  const total = stats?.total ?? 0;
  const count = (s: Status) => stats?.by_status[s] ?? 0;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Icon d={P.briefcase} className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold">Job Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Icon d={P.plus} className="h-4 w-4" /> Add application
            </button>
            <button onClick={logout} title="Log out"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <Icon d={P.logout} className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="col-span-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white shadow-sm md:col-span-1">
            <div className="text-sm text-indigo-100">Total applications</div>
            <div className="mt-1 text-4xl font-bold">{total}</div>
          </div>
          {STATUSES.map((s) => (
            <div key={s} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-full ${UI[s].dot}`} /> {UI[s].label}
              </div>
              <div className="mt-1 text-3xl font-bold">{count(s)}</div>
            </div>
          ))}
        </section>

        {/* Pipeline bar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium text-slate-600">Pipeline</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {total > 0 &&
              STATUSES.map((s) =>
                count(s) > 0 ? (
                  <div key={s} className={`${UI[s].bar} transition-all`}
                    style={{ width: `${(count(s) / total) * 100}%` }} title={`${UI[s].label}: ${count(s)}`} />
                ) : null
              )}
          </div>
        </section>

        {/* Search + filter chips */}
        <section className="space-y-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={P.search} className="h-4 w-4" />
            </span>
            <input className={`${input} pl-9`} placeholder="Search by company or position..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ v: "", label: "All", n: total }, ...STATUSES.map((s) => ({ v: s, label: UI[s].label, n: count(s) }))].map((c) => (
              <button key={c.v} onClick={() => setFilter(c.v)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  filter === c.v
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}>
                {c.label} <span className="opacity-60">{c.n}</span>
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
            ))}
          </div>
        ) : jobs.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Icon d={P.briefcase} className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">No applications found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {search || filter ? "Try a different search or filter." : "Add your first application to get started."}
            </p>
            {!search && !filter && (
              <button onClick={openNew}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Add application
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}
                className="pop flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${AVATARS[j.id % AVATARS.length]}`}>
                    {j.company.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{j.position}</div>
                    <div className="truncate text-sm text-slate-500">{j.company}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {j.location && (
                        <span className="inline-flex items-center gap-1"><Icon d={P.pin} className="h-3.5 w-3.5" />{j.location}</span>
                      )}
                      {fmtDate(j.applied_date) && (
                        <span className="inline-flex items-center gap-1"><Icon d={P.calendar} className="h-3.5 w-3.5" />{fmtDate(j.applied_date)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select value={j.status} onChange={(e) => changeStatus(j.id, e.target.value as Status)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ring-1 outline-none ${UI[j.status].badge}`}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{UI[s].label}</option>
                    ))}
                  </select>
                  <button onClick={() => openEdit(j)} title="Edit"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <Icon d={P.edit} className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={() => remove(j.id)} title="Delete"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Icon d={P.trash} className="h-4.5 w-4.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Add / edit modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()}
            className="pop w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "Edit application" : "New application"}</h2>
              <button type="button" onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon d={P.x} className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm font-medium text-slate-700 sm:col-span-1">
                Company
                <input required className={`${input} mt-1`} value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700 sm:col-span-1">
                Position
                <input required className={`${input} mt-1`} value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select className={`${input} mt-1`} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{UI[s].label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Applied date
                <input type="date" className={`${input} mt-1`} value={form.applied_date}
                  onChange={(e) => setForm({ ...form, applied_date: e.target.value })} />
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700">
                Location
                <input className={`${input} mt-1`} placeholder="e.g. Colombo or Remote" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700">
                Notes
                <textarea rows={3} className={`${input} mt-1`} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
