// 複習引擎(SRS)。單詞 + 句子共用 review_items / review_events。
// 需要 Supabase;無金鑰則為 no-op(複習功能需 DB)。

import { hasSupabase, selectEq, upsertReturning, insertRows } from "./supabase";

export type ReviewKind = "word" | "sentence";
export type ReviewEvent = "wrong" | "unknown" | "correct" | "seen";
export type ReviewStatus = "new" | "learning" | "weak" | "known";

export type ReviewItem = {
  id: number;
  kind: ReviewKind;
  ref: string;
  text: string;
  native_zh: string;
  pattern_id: string | null;
  status: ReviewStatus;
  wrong_count: number;
  marked_unknown_at: string | null;
  last_wrong_at: string | null;
  last_seen: string | null;
  next_review: string | null;
  interval_days: number;
  ease: number;
};

const DAY = 86400 * 1000;

// 簡單 SM-2 風格:答對拉長、答錯/不會歸零並降 ease
function schedule(prev: Partial<ReviewItem> | undefined, event: ReviewEvent) {
  const ease0 = prev?.ease ?? 2.5;
  const int0 = prev?.interval_days ?? 0;
  let interval = int0;
  let ease = ease0;
  let status: ReviewStatus = (prev?.status as ReviewStatus) ?? "new";
  if (event === "correct") {
    interval = int0 <= 0 ? 1 : Math.min(int0 * ease0, 365);
    status = interval >= 21 ? "known" : "learning";
  } else if (event === "wrong" || event === "unknown") {
    interval = 0.04; // ~1 小時後再來
    ease = Math.max(1.3, ease0 - 0.2);
    status = "weak";
  }
  return { interval_days: interval, ease, status, next_review: new Date(Date.now() + interval * DAY).toISOString() };
}

export async function logReview(args: {
  kind: ReviewKind;
  ref: string;
  text: string;
  nativeZh?: string;
  patternId?: string | null;
  event: ReviewEvent;
}): Promise<void> {
  if (!hasSupabase) return;
  const existing = (await selectEq<ReviewItem>("review_items", "ref", args.ref))[0];
  const s = schedule(existing, args.event);
  const now = new Date().toISOString();
  const bump = args.event === "wrong" || args.event === "unknown" ? 1 : 0;
  const patch: Record<string, unknown> = {
    ref: args.ref,
    kind: args.kind,
    text: args.text,
    native_zh: args.nativeZh ?? existing?.native_zh ?? "",
    pattern_id: args.patternId ?? existing?.pattern_id ?? null,
    status: s.status,
    wrong_count: (existing?.wrong_count ?? 0) + bump,
    last_seen: now,
    interval_days: s.interval_days,
    ease: s.ease,
    next_review: s.next_review,
  };
  if (args.event === "wrong") patch.last_wrong_at = now;
  if (args.event === "unknown") patch.marked_unknown_at = now;
  const rows = await upsertReturning<{ id: number }>("review_items", [patch], "ref", "id");
  const id = rows[0]?.id;
  if (id != null) await insertRows("review_events", [{ item_id: id, event: args.event }]);
}

export async function getReviewItems(kind: ReviewKind): Promise<ReviewItem[]> {
  const items = await selectEq<ReviewItem>("review_items", "kind", kind);
  const rank = (s: ReviewStatus) => ({ weak: 0, learning: 1, new: 2, known: 3 }[s] ?? 2);
  return items.sort((a, b) => rank(a.status) - rank(b.status) || (a.next_review ?? "").localeCompare(b.next_review ?? ""));
}

export function isDue(it: ReviewItem): boolean {
  if (it.status === "weak") return true;
  if (!it.next_review) return true;
  return new Date(it.next_review).getTime() <= Date.now();
}
