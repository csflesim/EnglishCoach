"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, signup, getCurrentUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { if (getCurrentUser()) router.replace("/"); }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const fn = mode === "login" ? login : signup;
    const r = await fn(username.trim(), password);
    setBusy(false);
    if (r.ok) router.replace("/");
    else setErr(r.error || "失敗");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-xl font-black text-ink-950">R</span>
        <div className="leading-tight">
          <div className="text-base font-bold">English Reflex Coach</div>
          <div className="text-[11px] text-slate-500">FSI 反射訓練器</div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex gap-2">
          <button onClick={() => { setMode("login"); setErr(""); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>登入</button>
          <button onClick={() => { setMode("signup"); setErr(""); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "signup" ? "bg-accent text-ink-950" : "bg-ink-800 text-slate-300"}`}>註冊</button>
        </div>

        {!hasSupabase ? (
          <p className="text-center text-sm text-gold">需連接 Supabase 才能使用帳號功能。</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">帳號</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-slate-100 outline-none focus:border-accent" placeholder="你的帳號" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">密碼</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 pr-11 text-slate-100 outline-none focus:border-accent" placeholder="••••••" />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "隱藏密碼" : "顯示密碼"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-200">{showPw ? "🙈" : "👁"}</button>
              </div>
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}</button>
          </form>
        )}
        <p className="mt-4 text-center text-[11px] text-slate-600">密碼經 scrypt 雜湊儲存,透過 HTTPS 加密傳輸,不會以明文保存。</p>
      </div>
    </div>
  );
}
