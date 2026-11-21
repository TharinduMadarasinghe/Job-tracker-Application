import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, clearToken, getToken, setToken, Job, Stats, Status } from "./src/api";

const C = { bg: "#f1f5f9", card: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", primary: "#4f46e5", danger: "#e11d48" };
const STATUSES: Status[] = ["applied", "interviewing", "offer", "rejected"];
const UI: Record<Status, { label: string; bg: string; fg: string }> = {
  applied: { label: "Applied", bg: "#dbeafe", fg: "#1d4ed8" },
  interviewing: { label: "Interviewing", bg: "#fef3c7", fg: "#b45309" },
  offer: { label: "Offer", bg: "#d1fae5", fg: "#047857" },
  rejected: { label: "Rejected", bg: "#ffe4e6", fg: "#be123c" },
};
const AVATARS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6"];
const EMPTY = { company: "", position: "", status: "applied" as Status, location: "", applied_date: "", notes: "" };

/* ------------------------------ Auth screen ------------------------------ */
function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ token: string }>(`/${mode}`, "POST", form);
      await setToken(res.token);
      onAuthed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.flex}>
      <KeyboardAvoidingView style={s.authWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.logo}><Text style={s.logoText}>JT</Text></View>
        <Text style={s.h1}>{mode === "login" ? "Welcome back" : "Create account"}</Text>
        <Text style={s.muted}>{mode === "login" ? "Log in to see your applications" : "Start tracking your job search"}</Text>

        {mode === "register" && (
          <TextInput style={s.input} placeholder="Full name" value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })} />
        )}
        <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
          value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
        <TextInput style={s.input} placeholder="Password (min 6 characters)" secureTextEntry
          value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />

        {!!error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{mode === "login" ? "Log in" : "Register"}</Text>}
        </Pressable>

        <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          <Text style={s.link}>{mode === "login" ? "No account? Register" : "Have an account? Log in"}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------- Dashboard ------------------------------- */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleError = useCallback(async (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      await clearToken();
      onLogout();
    } else {
      setError((e as Error).message);
    }
  }, [onLogout]);

  const load = useCallback(async () => {
    try {
      const q = [search && `search=${encodeURIComponent(search)}`, filter && `status=${filter}`].filter(Boolean).join("&");
      const [list, st] = await Promise.all([
        api<{ data: Job[] }>(`/applications?${q}`),
        api<Stats>("/applications/stats"),
      ]);
      setJobs(list.data);
      setStats(st);
      setError("");
    } catch (e) {
      await handleError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filter, handleError]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function openNew() {
    setEditingId(null); setForm(EMPTY); setFormError(""); setOpen(true);
  }
  function openEdit(j: Job) {
    setEditingId(j.id);
    setForm({
      company: j.company, position: j.position, status: j.status,
      location: j.location ?? "", applied_date: j.applied_date?.slice(0, 10) ?? "", notes: j.notes ?? "",
    });
    setFormError(""); setOpen(true);
  }

  async function save() {
    if (!form.company.trim() || !form.position.trim()) return setFormError("Company and position are required.");
    if (form.applied_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.applied_date)) return setFormError("Date must look like 2026-11-21.");
    setSaving(true);
    try {
      await api(editingId ? `/applications/${editingId}` : "/applications", editingId ? "PUT" : "POST", form);
      setOpen(false);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert("Delete application", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await api(`/applications/${editingId}`, "DELETE"); setOpen(false); load(); }
          catch (e) { setFormError((e as Error).message); }
        },
      },
    ]);
  }

  async function logout() {
    try { await api("/logout", "POST"); } catch {}
    await clearToken();
    onLogout();
  }

  const count = (st: Status) => stats?.by_status[st] ?? 0;

  return (
    <SafeAreaView style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.h1}>Job Tracker</Text>
        <Pressable onPress={logout}><Text style={s.linkSmall}>Log out</Text></Pressable>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        <View style={[s.stat, { backgroundColor: C.primary }]}>
          <Text style={[s.statLabel, { color: "#c7d2fe" }]}>Total</Text>
          <Text style={[s.statNum, { color: "#fff" }]}>{stats?.total ?? 0}</Text>
        </View>
        {STATUSES.map((st) => (
          <View key={st} style={s.stat}>
            <Text style={[s.statLabel, { color: UI[st].fg }]}>{UI[st].label}</Text>
            <Text style={s.statNum}>{count(st)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search + filters */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TextInput style={s.input} placeholder="Search company or position" value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ v: "", label: "All" }, ...STATUSES.map((st) => ({ v: st, label: UI[st].label }))].map((c) => (
            <Pressable key={c.v} onPress={() => setFilter(c.v)}
              style={[s.chip, filter === c.v && { backgroundColor: C.text, borderColor: C.text }]}>
              <Text style={[s.chipText, filter === c.v && { color: "#fff" }]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {!!error && <Text style={[s.error, { marginHorizontal: 16, marginTop: 10 }]}>{error}</Text>}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => String(j.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No applications found</Text>
              <Text style={s.muted}>{search || filter ? "Try a different search or filter." : "Tap + to add your first one."}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => openEdit(item)}>
              <View style={[s.avatar, { backgroundColor: AVATARS[item.id % AVATARS.length] }]}>
                <Text style={s.avatarText}>{item.company.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.position}</Text>
                <Text style={s.muted} numberOfLines={1}>{item.company}</Text>
                {!!(item.location || item.applied_date) && (
                  <Text style={s.meta} numberOfLines={1}>
                    {[item.location, item.applied_date?.slice(0, 10)].filter(Boolean).join("  ·  ")}
                  </Text>
                )}
              </View>
              <View style={[s.badge, { backgroundColor: UI[item.status].bg }]}>
                <Text style={[s.badgeText, { color: UI[item.status].fg }]}>{UI[item.status].label}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Floating add button */}
      <Pressable style={s.fab} onPress={openNew}><Text style={s.fabText}>+</Text></Pressable>

      {/* Add / edit modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.flex}>
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={s.header}>
              <Pressable onPress={() => setOpen(false)}><Text style={s.linkSmall}>Cancel</Text></Pressable>
              <Text style={s.cardTitle}>{editingId ? "Edit application" : "New application"}</Text>
              <Pressable onPress={save} disabled={saving}>
                <Text style={[s.linkSmall, { fontWeight: "700" }]}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Company</Text>
              <TextInput style={s.input} value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} />
              <Text style={s.label}>Position</Text>
              <TextInput style={s.input} value={form.position} onChangeText={(v) => setForm({ ...form, position: v })} />

              <Text style={s.label}>Status</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STATUSES.map((st) => (
                  <Pressable key={st} onPress={() => setForm({ ...form, status: st })}
                    style={[s.chip, form.status === st && { backgroundColor: UI[st].bg, borderColor: UI[st].fg }]}>
                    <Text style={[s.chipText, form.status === st && { color: UI[st].fg, fontWeight: "700" }]}>{UI[st].label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Location</Text>
              <TextInput style={s.input} placeholder="e.g. Colombo or Remote" value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })} />
              <Text style={s.label}>Applied date (YYYY-MM-DD)</Text>
              <TextInput style={s.input} placeholder="2026-11-21" value={form.applied_date}
                onChangeText={(v) => setForm({ ...form, applied_date: v })} />
              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 90, textAlignVertical: "top" }]} multiline value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })} />

              {!!formError && <Text style={s.error}>{formError}</Text>}

              {editingId && (
                <Pressable style={s.deleteBtn} onPress={remove}>
                  <Text style={{ color: C.danger, fontWeight: "600" }}>Delete application</Text>
                </Pressable>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* --------------------------------- Root ---------------------------------- */
export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    getToken().then((t) => { setAuthed(!!t); setReady(true); });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {!ready ? (
        <View style={[s.flex, { justifyContent: "center" }]}><ActivityIndicator color={C.primary} /></View>
      ) : authed ? (
        <Dashboard onLogout={() => setAuthed(false)} />
      ) : (
        <AuthScreen onAuthed={() => setAuthed(true)} />
      )}
    </SafeAreaProvider>
  );
}

/* --------------------------------- Styles -------------------------------- */
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  authWrap: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  h1: { fontSize: 24, fontWeight: "800", color: C.text },
  muted: { color: C.muted, fontSize: 13 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: C.primary, textAlign: "center", fontWeight: "600", marginTop: 4 },
  linkSmall: { color: C.primary, fontSize: 15 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.text },
  label: { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: -6 },
  btn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  error: { color: "#b91c1c", backgroundColor: "#fee2e2", padding: 10, borderRadius: 8, fontSize: 13 },
  statsRow: { flexGrow: 0, marginBottom: 12 },
  stat: { minWidth: 96, backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  statLabel: { fontSize: 12, fontWeight: "600" },
  statNum: { fontSize: 26, fontWeight: "800", color: C.text, marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 13, color: C.muted, fontWeight: "500" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  meta: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 50, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  fab: { position: "absolute", right: 20, bottom: 28, width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 32, fontWeight: "400" },
  deleteBtn: { alignItems: "center", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#fecdd3", backgroundColor: "#fff1f2", marginTop: 8 },
});
