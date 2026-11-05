import { AuroraBackground } from "./AuroraBackground";

/** Where to go after signing in: only a path on this site. `//host` and `\\host` would leave it, so they fall back to "/". */
export const safeNext = (raw: string | null) => (raw && /^\/(?![\/\\])/.test(raw) ? raw : "/");

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
  return (
    <label className="block">
      <span className="label text-ink/70">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`kr mt-1 h-12 w-full border-b bg-transparent text-[17px] outline-none ${error ? "border-coral" : "border-ink/40 focus:border-ink"}`}
      />
      {error ? <span id={`${name}-err`} className="kr mt-1 block text-[13px] text-coral">{error}</span> : hint ? <span className="kr mt-1 block text-[12px] text-ash">{hint}</span> : null}
    </label>
  );
}
