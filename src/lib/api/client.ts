import { apiBase } from "./config";
import type { ErrorResponse } from "./types";

/** Server-side calls (ISR, share links) give up after this long; the client keeps the browser's own limits. */
const SERVER_TIMEOUT_MS = 10_000;

/** An API error normalised from the backend's ErrorResponse (or a network failure). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> | null = null,
    /** Seconds, from the Retry-After header on 429. */
    public retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get isAuth() { return this.status === 401; }
  get isNotFound() { return this.status === 404; }
  /** Field → message map for form errors (backend sends most validation failures as 400 + details). */
  get fieldErrors(): Record<string, string> {
    const d = this.details ?? {};
    return Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  }
}

type Init = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | null | undefined>;
  /** Attach the logged-in user's token (client only). "optional" = attach if logged in. */
  auth?: "required" | "optional" | "none";
  /** Next.js fetch cache hint for server-side calls. */
  revalidate?: number | false;
};

function qs(query: Init["query"]) {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function toError(res: Response): Promise<ApiError> {
  let body: Partial<ErrorResponse> | null = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  const retry = res.headers.get("Retry-After");
  return new ApiError(
    res.status,
    body?.code ?? `HTTP_${res.status}`,
    body?.message ?? res.statusText ?? "Request failed",
    (body?.details as Record<string, unknown> | null | undefined) ?? null,
    retry ? Number(retry) : null,
  );
}

/**
 * fetch wrapper for coverage-backend.
 * - JSON in/out, empty bodies (204) → undefined
 * - On the client, attaches the Bearer token and, after a 401, refreshes once and retries.
 */
export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const { body, query, auth = "optional", revalidate, headers, ...rest } = init;
  const isClient = typeof window !== "undefined";
  const h = new Headers(headers);
  if (body !== undefined) h.set("Content-Type", "application/json");

  let token: string | null = null;
  if (isClient && auth !== "none") {
    const { freshAccessToken } = await import("./session");
    token = await freshAccessToken();
    if (!token && auth === "required") throw new ApiError(401, "UNAUTHORIZED", "Login required");
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  const url = `${apiBase()}${path}${qs(query)}`;
  const doFetch = async () => {
    try {
      return await fetch(url, {
        ...rest,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
        // A hung backend must not hold a server render open for minutes.
        ...(isClient ? {} : { signal: AbortSignal.timeout(SERVER_TIMEOUT_MS) }),
        ...(isClient ? {} : { next: revalidate === undefined ? { revalidate: 60 } : revalidate === false ? undefined : { revalidate } }),
        ...(isClient || revalidate !== false ? {} : { cache: "no-store" as const }),
      });
    } catch (e) {
      throw new ApiError(0, "NETWORK_ERROR", e instanceof Error ? e.message : "Network error");
    }
  };

  let res = await doFetch();

  // Access token rejected (e.g. expired early) → refresh once and retry.
  if (res.status === 401 && isClient && token) {
    const { getSession, refreshOnce } = await import("./session");
    // Another caller may already have rotated the pair while this request was out: use that, don't spend a refresh.
    const now = getSession();
    const s = now && now.accessToken !== token ? now : await refreshOnce();
    if (s && s.accessToken !== token) {
      h.set("Authorization", `Bearer ${s.accessToken}`);
      res = await doFetch();
    }
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
