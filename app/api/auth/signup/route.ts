export const runtime = "nodejs";

import { hasDb, hashPassword, findUser, createUser } from "../_lib";

export async function POST(req: Request) {
  if (!hasDb) return Response.json({ error: "no_db" }, { status: 500 });
  try {
    const { username, password } = await req.json();
    const u = String(username ?? "").trim();
    const p = String(password ?? "");
    if (u.length < 2) return Response.json({ error: "帳號至少 2 個字" }, { status: 400 });
    if (p.length < 4) return Response.json({ error: "密碼至少 4 個字" }, { status: 400 });
    if (await findUser(u)) return Response.json({ error: "帳號已存在" }, { status: 409 });
    const created = await createUser(u, hashPassword(p)); // 只存雜湊,不存明文
    if (!created) return Response.json({ error: "建立失敗" }, { status: 500 });
    return Response.json({ user: { id: String(created.id), username: created.username } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
