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
 * shares one in-flight refresh across every caller (and across tabs via the storage event).
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

/** Exchange the refresh token for a new pair. Any 400 means the session is over. */
export function refreshOnce(): Promise<Session | null> {
  if (inflight) return inflight;
  const s = getSession();
  if (!s) return Promise.resolve(null);
  const usedToken = s.refreshToken;
  inflight = (async () => {
    try {
      const res = await fetch(`${apiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: usedToken }),
      });
      if (!res.ok) {
        // Another tab may have rotated the token meanwhile — accept its result instead of logging out.
        loaded = false; load();
        if (current && current.refreshToken !== usedToken) return current;
        clearSession();
        return null;
      }
      setSessionFromAuth((await res.json()) as AuthResponse);
      return current;
    } catch {
      return getSession(); // network error: keep the session, let the caller fail normally
    } finally {
      inflight = null;
    }
  })();
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
