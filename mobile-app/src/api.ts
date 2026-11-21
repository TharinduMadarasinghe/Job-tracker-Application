import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// ---- CHANGE THIS to match how you run the app -------------------------------
// Android emulator : http://10.0.2.2:8000/api
// iOS simulator    : http://localhost:8000/api
// Real phone       : http://YOUR-PC-IPV4:8000/api   (run `ipconfig` to find it)
// -----------------------------------------------------------------------------
export const API = "http://10.0.2.2:8000/api";

export type Status = "applied" | "interviewing" | "offer" | "rejected";

export interface Job {
  id: number;
  company: string;
  position: string;
  status: Status;
  location?: string | null;
  applied_date?: string | null;
  notes?: string | null;
}

export interface Stats {
  total: number;
  by_status: Partial<Record<Status, number>>;
}

const KEY = "job_tracker_token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
export async function setToken(t: string) {
  if (Platform.OS === "web") return localStorage.setItem(KEY, t);
  await SecureStore.setItemAsync(KEY, t);
}
export async function clearToken() {
  if (Platform.OS === "web") return localStorage.removeItem(KEY);
  await SecureStore.deleteItemAsync(KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, method = "GET", body?: object): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check the API address, Wi-Fi and that the backend is running.", 0);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const first = data.errors ? (Object.values(data.errors) as string[][])[0]?.[0] : null;
    throw new ApiError(first ?? data.message ?? "Request failed", res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
