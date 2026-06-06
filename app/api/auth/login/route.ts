export const runtime = "nodejs";

import { hasDb, verifyPassword, findUser } from "../_lib";

export async function POST(req: Request) {
  if (!hasDb) return Response.json({ error: "no_db" }, { status: 500 });
  try {
    const { username, password } = await req.json();
    const u = String(username ?? "").trim();
    const p = String(password ?? "");
    const user = await findUser(u);
    if (!user || !verifyPassword(p, user.password_hash)) {
      return Response.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }
    return Response.json({ user: { id: String(user.id), username: user.username } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
