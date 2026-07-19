import { cookies } from "next/headers";

const COOKIE_NAME = "loop-subject";
const DEFAULT_SUBJECT = "governance";

export async function getActiveSubject(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? DEFAULT_SUBJECT;
}
