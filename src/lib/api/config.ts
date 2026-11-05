/**
 * Where COVERAGE reads its data from.
 *
 * - "mock" (default): the curated Changbi set bundled in src/data — no backend needed.
 * - "api": coverage-backend. The browser calls same-origin `/api/*`, which next.config.ts
 *   rewrites to COVERAGE_API_ORIGIN (the backend has no CORS). Server components call the
 *   backend directly at COVERAGE_API_ORIGIN.
 *
 * Set NEXT_PUBLIC_DATA_SOURCE=api and COVERAGE_API_ORIGIN=http://localhost:8080 to use the backend.
 */
export const DATA_SOURCE: "mock" | "api" = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";
export const USE_API = DATA_SOURCE === "api";

/** Base URL for API calls, including the `/api` context path. */
export function apiBase(): string {
  if (typeof window !== "undefined") return "/api";
  const origin = process.env.COVERAGE_API_ORIGIN;
  if (!origin) throw new Error("COVERAGE_API_ORIGIN is not set (needed for server-side API calls)");
  return `${origin.replace(/\/$/, "")}/api`;
}
