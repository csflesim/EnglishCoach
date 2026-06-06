// 多益錯題本(每位用戶各自一份,存 localStorage)。答錯加入、答對(複習時)移除。
import type { ToeicQuestion } from "./ai";
import { getCurrentUser } from "./auth";

function key(): string { return `erc_toeic_wrong_${getCurrentUser()?.id ?? "guest"}`; }

export function getWrong(): ToeicQuestion[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key()) || "[]") as ToeicQuestion[]; } catch { return []; }
}
function save(list: ToeicQuestion[]) { try { localStorage.setItem(key(), JSON.stringify(list)); } catch { /* ignore */ } }

export function addWrong(q: ToeicQuestion) {
  const l = getWrong();
  if (!l.some((x) => x.sentence === q.sentence)) { l.push(q); save(l); }
}
export function removeWrong(sentence: string) { save(getWrong().filter((x) => x.sentence !== sentence)); }
export function clearWrong() { save([]); }
