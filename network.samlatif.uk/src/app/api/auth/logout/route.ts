import { cookies } from "next/headers";
import { CURRENT_USER_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_USER_COOKIE);
  return Response.json({ ok: true });
}
