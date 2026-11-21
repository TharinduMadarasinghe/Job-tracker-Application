export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

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

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const first = body.errors ? (Object.values(body.errors) as string[][])[0]?.[0] : null;
    throw new ApiError(first ?? body.message ?? "Request failed", res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
