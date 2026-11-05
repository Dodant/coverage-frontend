"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signup } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { setSessionFromAuth } from "@/lib/api/session";
import type { SignupRole } from "@/lib/api/types";
import { AuthShell, Field, safeNext } from "@/components/AuthShell";

const ROLES: { id: SignupRole; en: string; kr: string }[] = [
  { id: "MEMBER", en: "Reader", kr: "일반 회원" },
  { id: "DESIGNER", en: "Designer", kr: "디자이너" },
  { id: "AUTHOR", en: "Author", kr: "작가" },
  { id: "PUBLISHER", en: "Publisher", kr: "출판사" },
];

export function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("MEMBER");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Mirror the backend's rules so most mistakes are caught before the round trip.
  const local = () => {
    const e: Record<string, string> = {};
    if (displayName.trim().length < 2 || displayName.trim().length > 50) e.displayName = "2–50자로 입력하세요";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "이메일 형식이 아닙니다";
    if (password.length < 8 || password.length > 100) e.password = "8–100자로 입력하세요";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = local();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      setSessionFromAuth(await signup({ email, password, displayName: displayName.trim(), role }));
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        // Duplicate email is a 400 with details.email (not 409).
        setErrors({ ...err.fieldErrors, form: Object.keys(err.fieldErrors).length ? "" : err.status === 0 ? "서버에 연결할 수 없습니다 · Can't reach the server." : err.message });
      } else setErrors({ form: "가입하지 못했습니다 · Sign-up failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell kicker="Join — 가입" title={<>Open your<br /><span className="serif-i font-normal">own room.</span></>} aside="표지를 모으고, 전시를 열고, 디자이너라면 작업을 기록하세요. 역할은 가입 후 프로필에 표시됩니다.">
      <form onSubmit={submit} noValidate className="space-y-6">
        <Field label="Name · 이름" name="displayName" autoComplete="nickname" value={displayName} onChange={setName} error={errors.displayName} required />
        <Field label="Email · 이메일" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} required />
        <Field label="Password · 비밀번호" name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="8자 이상" required />
        <fieldset>
          <legend className="label text-ink/70">I am · 나는</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label key={r.id} className={`flex h-12 cursor-pointer items-center justify-between rounded-full border px-4 text-sm ${role === r.id ? "border-ink bg-ink text-museum" : "border-ink/30 hover:border-ink"}`}>
                <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} className="sr-only" />
                <span className="font-medium">{r.en}</span><span className="kr text-xs opacity-70">{r.kr}</span>
              </label>
            ))}
          </div>
          {errors.role && <span className="kr mt-1 block text-[13px] text-coral">{errors.role}</span>}
        </fieldset>
        {errors.form && <p role="alert" className="kr text-[14px] text-coral">{errors.form}</p>}
        <button type="submit" disabled={busy} className="h-12 w-full rounded-full bg-ink text-sm font-medium text-museum transition-colors hover:bg-violet disabled:opacity-50">
          {busy ? "Creating…" : "Create account · 가입하기"}
        </button>
        <p className="label text-center text-ash">
          Already a member? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
