import { useState } from "react";
import { AuroraBackground } from "./AuroraBackground";

/**
 * Where to go after signing in: only a path on this site. The value is parsed the way the browser will
 * parse it (so `//host`, `\\host`, `/\t/host` and `javascript:` all resolve off-site) and reduced to its path.
 * A fixed base keeps the result identical on server and client.
 */
export function safeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    const u = new URL(raw, "http://coverage.local");
    const path = u.pathname + u.search + u.hash;
    // Same origin, and a path that starts with exactly one "/" — `http://coverage.local//host` has pathname `//host`.
    if (u.origin !== "http://coverage.local" || !/^\/(?![\/\\])/.test(path)) return "/";
    // Never bounce a freshly signed-in visitor back onto the sign-in or join form.
    return /^\/(login|signup)(?=[/?#]|$)/.test(path) ? "/" : path;
  } catch { return "/"; }
}

/** Shared frame for login / signup: a quiet aurora room with one form. */
export function AuthShell({ kicker, title, children, aside }: { kicker: string; title: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <AuroraBackground preset="ember" grain={0.26} />
      <div className="wrap relative z-[2] grid min-h-[100svh] grid-cols-12 items-center gap-x-[var(--gutter)] gap-y-12 pb-16 pt-28">
        <div className="col-span-12 md:col-span-6">
          <p className="label">{kicker}</p>
          <h1 className="display mt-6 text-[clamp(3rem,9vw,8rem)] leading-[0.84]">{title}</h1>
          {aside && <div className="kr mt-8 max-w-md text-[15px] leading-[1.75] text-ink/80">{aside}</div>}
        </div>
        <div className="col-span-12 md:col-span-5 md:col-start-8">
          <div className="border border-ink/15 bg-museum/80 p-6 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.45)] backdrop-blur-xl md:p-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Field({ label, name, type = "text", value, onChange, error, autoComplete, hint, required }: {
  label: string; name: string; type?: string; value: string; onChange: (v: string) => void; error?: string; autoComplete?: string; hint?: string; required?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const secret = type === "password";
  const input = (
      <input
        id={name}
        name={name}
        type={secret && shown ? "text" : type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`kr mt-1 h-12 w-full border-b bg-transparent text-[17px] outline-none ${secret ? "pr-20" : ""} ${error ? "border-coral" : "border-ink/40 focus:border-ink"}`}
      />
  );
  return (
    <div className="block">
      <label htmlFor={name} className="label block text-ink/70">{label}</label>
      {secret ? (
        <div className="relative">
          {input}
          <button type="button" aria-pressed={shown} aria-controls={name} aria-label="Show password" onClick={() => setShown((v) => !v)} className="label absolute bottom-0 right-0 h-12 px-1 text-ink/60 hover:text-ink">
            {shown ? "Hide · 숨김" : "Show · 보기"}
          </button>
        </div>
      ) : input}
      {error ? <span id={`${name}-err`} className="kr mt-1 block text-[13px] text-coral">{error}</span> : hint ? <span className="kr mt-1 block text-[12px] text-ash">{hint}</span> : null}
    </div>
  );
}
