"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getMe, logout, updateMe } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { clearSession, getSession, updateSessionUser, useSession } from "@/lib/api/session";
import type { UserProfileResponse } from "@/lib/api/types";
import { AuthShell, Field } from "@/components/AuthShell";

export function AccountView() {
  const router = useRouter();
  const session = useSession();
  const [me, setMe] = useState<UserProfileResponse | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load the profile for whoever is signed in — again if another tab switches account.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const uid = session?.user.id;
  const leaving = useRef(false);
  useEffect(() => {
    if (!hydrated || leaving.current) return;
    if (!uid) { router.replace("/login?next=/account"); return; }
    let alive = true;
    setMe(null);
    getMe().then((m) => { if (!alive) return; setMe(m); setName(m.displayName); setWebsite(m.websiteUrl ?? ""); setPortfolio(m.portfolioUrl ?? ""); })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.isAuth) { router.replace("/login?next=/account"); return; }
        setErrors({ form: e instanceof ApiError && e.status === 0 ? "서버에 연결할 수 없습니다 · Can't reach the server." : "프로필을 불러오지 못했습니다 · Couldn't load your profile. 새로고침해 주세요." });
      });
    return () => { alive = false; };
  }, [hydrated, uid, router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setSaved(false);
    try {
      // "" clears a URL on the backend; null/omitted leaves it unchanged.
      const m = await updateMe({ displayName: name.trim(), websiteUrl: website.trim(), portfolioUrl: portfolio.trim() });
      setMe(m); setSaved(true); updateSessionUser({ displayName: m.displayName });
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fieldErrors, form: Object.keys(err.fieldErrors).length ? "" : err.message } : { form: "저장하지 못했습니다" });
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    leaving.current = true; // the session is about to end on purpose: go home, not to sign-in
    const s = getSession();
    if (s) await logout(s.refreshToken).catch(() => {});
    clearSession();
    router.replace("/");
  };

  return (
    <AuthShell
      kicker={`Account — ${me?.role ?? session?.user.role ?? ""}`}
      title={<>{me?.displayName ?? session?.user.displayName ?? "…"}</>}
      aside={me && <p className="label text-ash">{me.email}<br />Member since {new Date(me.createdAt).toLocaleDateString("ko-KR")} · {me.title === "CONTRIBUTOR" ? "Contributor" : "Member"} · {me.contributionCount} contributions</p>}
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Field label="Name · 이름" name="displayName" value={name} onChange={setName} error={errors.displayName} />
        <Field label="Website" name="websiteUrl" type="url" value={website} onChange={setWebsite} error={errors.websiteUrl} hint="https://…" />
        <Field label="Portfolio" name="portfolioUrl" type="url" value={portfolio} onChange={setPortfolio} error={errors.portfolioUrl} hint="https://…" />
        {errors.form && <p role="alert" className="kr text-[14px] text-coral">{errors.form}</p>}
        {saved && <p role="status" className="label text-ash">Saved · 저장됨</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !me} className="h-12 flex-1 rounded-full bg-ink text-sm font-medium text-museum hover:bg-violet disabled:opacity-50">Save · 저장</button>
          <button type="button" onClick={signOut} className="h-12 rounded-full border border-ink px-5 text-sm hover:bg-ink hover:text-museum">Sign out</button>
        </div>
      </form>
    </AuthShell>
  );
}
