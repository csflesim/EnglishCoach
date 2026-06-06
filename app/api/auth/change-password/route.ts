export const runtime = "nodejs";

import { hasDb, verifyPassword, hashPassword, findUser, updatePassword } from "../_lib";

export async function POST(req: Request) {
  if (!hasDb) return Response.json({ error: "no_db" }, { status: 500 });
  try {
    const { username, oldPassword, newPassword } = await req.json();
    const u = String(username ?? "").trim();
    const oldP = String(oldPassword ?? "");
    const newP = String(newPassword ?? "");
    if (newP.length < 4) return Response.json({ error: "新密碼至少 4 個字" }, { status: 400 });
    const user = await findUser(u);
    if (!user || !verifyPassword(oldP, user.password_hash)) {
      return Response.json({ error: "目前密碼錯誤" }, { status: 401 });
    }
    const ok = await updatePassword(user.id, hashPassword(newP)); // 只存新雜湊
    if (!ok) return Response.json({ error: "更新失敗" }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
