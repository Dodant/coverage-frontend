"use client";

import { useSyncExternalStore } from "react";
import { apiBase } from "./config";
import type { AuthResponse, AuthUserInfo } from "./types";

/**
 * Login session (client only).
 *
 * The backend authenticates with `Authorization: Bearer` only — no cookies — so tokens live in
 * localStorage. Refresh tokens are single-use: every refresh returns a new pair, and two
 * concurrent refreshes with the same token make one of them fail. `refreshOnce` therefore
 * shares one in-flight refresh across every caller, and a Web Lock serialises it across tabs.
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires (from `expiresIn`, seconds). */
  expiresAt: number;
  user: AuthUserInfo;
}

const KEY = "coverage:session";
let current: Session | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Session>) : null;
    // Only a well-formed session is trusted; a stale or tampered value would otherwise crash every page in the nav.
    current = s && typeof s.accessToken === "string" && typeof s.refreshToken === "string" && typeof s.expiresAt === "number" && typeof s.user?.id === "string" ? (s as Session) : null;
  } catch {
    current = null;
  }
}
function emit() { listeners.forEach((l) => l()); }

export function getSession(): Session | null { load(); return current; }

export function setSessionFromAuth(r: AuthResponse) {
  current = { accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: Date.now() + r.expiresIn * 1000, user: r.user };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* memory only */ }
  emit();
}

export function updateSessionUser(user: Partial<AuthUserInfo>) {
  if (!current) return;
  current = { ...current, user: { ...current.user, ...user } };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
  emit();
}

export function clearSession() {
  current = null;
  try { localStorage.removeItem(KEY); } catch {}
  emit();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { loaded = false; load(); emit(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}

// ── Single-flight refresh ────────────────────────────────────────────────
let inflight: Promise<Session | null> | null = null;

/** Re-read localStorage: another tab may have rotated (or ended) the session. */
function reread() { loaded = false; load(); return current; }

/** Run `fn` while holding a cross-tab lock, so two tabs never spend the same single-use refresh token. */
function withTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? locks.request("coverage:refresh", fn) : fn();
}

/**
 * Exchange the refresh token for a new pair, once across every caller and every tab.
 * Only a definitive rejection (400/401) ends the session; a 5xx or network failure keeps it.
 */
export function refreshOnce(): Promise<Session | null> {
  if (inflight) return inflight;
  if (!getSession()) return Promise.resolve(null);
  const seen = current!.refreshToken;
  inflight = withTabLock(async () => {
    // A tab that held the lock before us may already have rotated the pair.
    const s = reread();
    if (!s || s.refreshToken !== seen) return s;
    try {
      const res = await fetch(`${apiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: seen }),
        // A hung backend must not hold the cross-tab lock (and every tab's next request) forever.
        signal: AbortSignal.timeout(10_000),
      });
      // Signed out or switched account while the request was out: its answer is no longer ours to store.
      if (reread()?.refreshToken !== seen) return current;
      if (res.status === 400 || res.status === 401) { clearSession(); return null; }
      if (!res.ok) return current;
      setSessionFromAuth((await res.json()) as AuthResponse);
      return current;
    } catch {
      return getSession(); // network error: keep the session, let the caller fail normally
    }
  }).finally(() => { inflight = null; });
  return inflight;
}

/** A valid access token, refreshing first when it expires within the next minute. */
export async function freshAccessToken(): Promise<string | null> {
  const s = getSession();
  if (!s) return null;
  if (s.expiresAt - Date.now() > 60_000) return s.accessToken;
  const r = await refreshOnce();
  return r?.accessToken ?? null;
}
