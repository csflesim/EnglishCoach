"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { applyActiveUser, logout, type AuthUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/supabase";

const nav = [
  { href: "/", label: "訓練", en: "Training", icon: "⚡" },
  { href: "/words", label: "單詞", en: "Words", icon: "🔤" },
  { href: "/sentences", label: "句子", en: "Sentences", icon: "💬" },
  { href: "/toeic", label: "多益", en: "TOEIC", icon: "📖" },
  { href: "/analysis", label: "分析", en: "Analysis", icon: "◎" },
  { href: "/progress", label: "我的", en: "Mine", icon: "▤" },
];

// render 階段就同步套用目前登入者(確保子頁讀資料前 user id 已設定)
const initialUser = typeof window !== "undefined" ? applyActiveUser() : null;

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = applyActiveUser();
    setUser(u);
    setChecked(true);
    if (hasSupabase && !u) router.replace("/login"); // 需登入(永久登入:user 存 localStorage)
  }, [router]);

  // 需登入但尚未登入 → 不渲染內容(導向登入頁)
  if (hasSupabase && checked && !user) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      {/* top brand */}
      <header className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-lg font-black text-ink-950">R</span>
        <div className="leading-tight">
          <div className="text-sm font-bold">English Reflex Coach</div>
          <div className="text-[11px] text-slate-500">FSI 反射訓練器</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user && <Link href="/account" className="text-xs text-slate-400 hover:text-accent" title="帳號設定 · 變更密碼">{user.username}</Link>}
          {user && <button onClick={() => { logout(); router.replace("/login"); }} className="text-xs text-slate-600 hover:text-slate-300" title="登出">登出</button>}
          <Link href="/admin" className="text-slate-600 hover:text-slate-300" title="後台">⚙</Link>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      {/* bottom tab bar (3 pages) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around px-2 py-2">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs transition ${
                  active ? "text-accent" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
