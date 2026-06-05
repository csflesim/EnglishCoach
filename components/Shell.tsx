"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "訓練", en: "Training", icon: "⚡" },
  { href: "/words", label: "單詞", en: "Words", icon: "🔤" },
  { href: "/sentences", label: "句子", en: "Sentences", icon: "💬" },
  { href: "/progress", label: "進度", en: "Progress", icon: "▤" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      {/* top brand */}
      <header className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-lg font-black text-ink-950">R</span>
        <div className="leading-tight">
          <div className="text-sm font-bold">English Reflex Coach</div>
          <div className="text-[11px] text-slate-500">FSI 反射訓練器</div>
        </div>
        <Link href="/admin" className="ml-auto text-slate-600 hover:text-slate-300" title="後台">⚙</Link>
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
