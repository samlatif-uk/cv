import { cookies } from "next/headers";

export const CURRENT_USER_COOKIE = "network_username";

export async function getCurrentUsername() {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_USER_COOKIE)?.value ?? null;
}
