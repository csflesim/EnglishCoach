"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { getCurrentUser, changePassword, logout } from "@/lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const me = getCurrentUser();
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setOk(false);
    if (newP !== confirm) { setMsg("兩次新密碼不一致"); return; }
    setBusy(true);
    const r = await changePassword(oldP, newP);
    setBusy(false);
    if (r.ok) { setOk(true); setMsg("✓ 密碼已更新"); setOldP(""); setNewP(""); setConfirm(""); }
    else setMsg(r.error || "更新失敗");
  }

  const field = (label: string, val: string, set: (v: string) => void) => (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <input type={show ? "text" : "password"} value={val} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-slate-100 outline-none focus:border-accent" placeholder="••••••" />
    </div>
  );

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">帳號設定</h1>
        <p className="mt-1 text-sm text-slate-500">目前登入:{me?.username ?? "—"}</p>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">變更密碼</div>
          <button type="button" onClick={() => setShow((v) => !v)} className="text-xs text-slate-500 hover:text-slate-200">{show ? "🙈 隱藏" : "👁 顯示"}</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {field("目前密碼", oldP, setOldP)}
          {field("新密碼(至少 4 字)", newP, setNewP)}
          {field("再次輸入新密碼", confirm, setConfirm)}
          {msg && <p className={`text-sm ${ok ? "text-accent" : "text-red-400"}`}>{msg}</p>}
          <button type="submit" disabled={busy || !oldP || !newP} className="btn-primary w-full py-3">{busy ? "更新中…" : "更新密碼"}</button>
        </form>
        <p className="mt-3 text-center text-[11px] text-slate-600">密碼經 scrypt 雜湊儲存,不會以明文保存。</p>
      </div>

      <button onClick={() => { logout(); router.replace("/login"); }} className="btn-ghost mt-4 w-full py-2.5 text-sm text-red-400">登出</button>
    </Shell>
  );
}
