import { cookies } from "next/headers";

const CURRENT_USER_COOKIE = "network_username";
const DEMO_FALLBACK_USER = "samlatif";

export async function getCurrentUsername() {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_USER_COOKIE)?.value ?? DEMO_FALLBACK_USER;
}
