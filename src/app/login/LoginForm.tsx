"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { setSessionFromAuth } from "@/lib/api/session";
import { AuthShell, Field, safeNext } from "@/components/AuthShell";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      setSessionFromAuth(await login({ email, password }));
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        // Wrong email/password comes back as 400 with details.credentials; a locked account as 401.
        if (err.status === 401) setErrors({ form: "정지되었거나 탈퇴한 계정입니다 · This account can't sign in." });
        else if (err.status === 0) setErrors({ form: "서버에 연결할 수 없습니다 · Can't reach the server." });
        else if (err.status === 429) setErrors({ form: `잠시 후 다시 시도하세요 · Try again in ${err.retryAfter ?? 60}s.` });
        else setErrors({ ...err.fieldErrors, form: err.fieldErrors.credentials ?? (Object.keys(err.fieldErrors).length ? "" : err.message) });
      } else setErrors({ form: "로그인하지 못했습니다 · Sign-in failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell kicker="Members — 회원" title={<>Welcome<br /><span className="serif-i font-normal">back.</span></>} aside="좋아요를 남기고, 나만의 전시를 서버에 저장해 어느 기기에서든 이어서 꾸밀 수 있습니다.">
      <form onSubmit={submit} noValidate className="space-y-6">
        <Field label="Email · 이메일" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} required />
        <Field label="Password · 비밀번호" name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} required />
        {errors.form && <p role="alert" className="kr text-[14px] text-coral">{errors.form}</p>}
        <button type="submit" disabled={busy || !email || !password} className="h-12 w-full rounded-full bg-ink text-sm font-medium text-museum transition-colors hover:bg-violet disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in · 로그인"}
        </button>
        <p className="label text-center text-ash">
          No account? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Join · 가입</Link>
        </p>
      </form>
    </AuthShell>
  );
}
