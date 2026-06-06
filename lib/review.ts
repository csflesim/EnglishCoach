// 複習引擎(SRS)。單詞 + 句子共用 review_items / review_events。
// 需要 Supabase;無金鑰則為 no-op(複習功能需 DB)。

import { hasSupabase, selectEq, upsertReturning, insertRows, updateEq } from "./supabase";

export type ReviewKind = "word" | "sentence" | "drill";
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
  box: number;
};

// 艾賓豪斯 11 個複習週期(分鐘):5m,30m,12h,1d,2d,4d,7d,15d,1mo,3mo,6mo
const EB_MIN = [5, 30, 720, 1440, 2880, 5760, 10080, 21600, 43200, 129600, 259200];

// 盒子(box/gap)制:答對 box+1(間隔變長);答錯/不會 box 歸 0
function schedule(prev: Partial<ReviewItem> | undefined, event: ReviewEvent) {
  let box = prev?.box ?? 0;
  if (event === "correct") box = Math.min(box + 1, EB_MIN.length - 1);
  else if (event === "wrong" || event === "unknown") box = 0;
  const mins = EB_MIN[box];
  const status: ReviewStatus = event === "wrong" || event === "unknown" ? "weak" : box >= 8 ? "known" : "learning";
  return { box, interval_days: mins / 1440, status, next_review: new Date(Date.now() + mins * 60000).toISOString() };
}

// drill 發數:首次/gap1=20、gap2=10、gap3=5、gap4+=3
export function repCountForBox(box: number): number {
  return box <= 1 ? 20 : box === 2 ? 10 : box === 3 ? 5 : 3;
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
    box: s.box,
    next_review: s.next_review,
  };
  if (args.event === "wrong") patch.last_wrong_at = now;
  if (args.event === "unknown") patch.marked_unknown_at = now;
  const rows = await upsertReturning<{ id: number }>("review_items", [patch], "ref", "id");
  const id = rows[0]?.id;
  if (id != null) await insertRows("review_events", [{ item_id: id, event: args.event }]);
  // 鏡像 box 到 vocabulary(方便直接查;ref 即原字)
  if (args.kind === "word") updateEq("vocabulary", "word", args.ref.replace(/^word:/, ""), { box: s.box });
}

export async function getReviewItems(kind: ReviewKind): Promise<ReviewItem[]> {
  const items = await selectEq<ReviewItem>("review_items", "kind", kind);
  const rank = (s: ReviewStatus) => ({ weak: 0, learning: 1, new: 2, known: 3 }[s] ?? 2);
  return items.sort((a, b) => rank(a.status) - rank(b.status) || (a.next_review ?? "").localeCompare(b.next_review ?? ""));
}

// 單字複習狀態 map(word→狀態),供選詞引擎(答錯優先 / 到期複習)
export async function getWordReviewMap(): Promise<Map<string, { status: string; wrong_count: number; next_review: string | null }>> {
  const m = new Map<string, { status: string; wrong_count: number; next_review: string | null }>();
  if (!hasSupabase) return m;
  const items = await getReviewItems("word");
  for (const it of items) {
    const w = it.ref.replace(/^word:/, "");
    m.set(w, { status: it.status, wrong_count: it.wrong_count, next_review: it.next_review });
  }
  return m;
}

// 單字 box map(word(小寫)→ box),供後台顯示
export async function getWordBoxMap(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!hasSupabase) return m;
  const items = await getReviewItems("word");
  for (const it of items) m.set(it.ref.replace(/^word:/, ""), it.box ?? 0);
  return m;
}

export function isDue(it: ReviewItem): boolean {
  if (it.status === "weak") return true;
  if (!it.next_review) return true;
  return new Date(it.next_review).getTime() <= Date.now();
}

// ── drill(句型操練)複習 ──
export type DrillReview = { box: number; next_review: string | null };
const drillRef = (lessonId: string, type: string) => `drill:${lessonId}:${type}`;

// 記錄一次操練結果(整輪有錯→歸零;全對→box+1)
export async function logDrill(lessonId: string, type: string, text: string, hadError: boolean): Promise<void> {
  await logReview({ kind: "drill", ref: drillRef(lessonId, type), text, patternId: lessonId, event: hadError ? "wrong" : "correct" });
}

// 取得所有 drill 的複習狀態 map: ref → {box, next_review}
export async function getDrillReviewMap(): Promise<Map<string, DrillReview>> {
  const m = new Map<string, DrillReview>();
  if (!hasSupabase) return m;
  const items = await selectEq<ReviewItem>("review_items", "kind", "drill");
  for (const it of items) m.set(it.ref, { box: it.box ?? 0, next_review: it.next_review });
  return m;
}
export function drillKey(lessonId: string, type: string) { return drillRef(lessonId, type); }
