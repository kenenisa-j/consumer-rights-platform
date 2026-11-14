import { ROLES, type PortalKey, type RoleKey } from "@consumer-rights/contracts";

// Browser side of authentication. The API is reached through the same address as the site (see next.config.mjs),
// so the session cookie is set by the API and is never readable by scripts.

export type AuthResult = { ok: true; portal: PortalKey } | { ok: false; error: string };

const PHONE = /^(\+251|0)?[79]\d{8}$/;

/** 0911 234 567 and +251 911 234 567 both become +251911234567. Anything else is treated as an email. */
export function asPhone(value: string): string | null {
  const compact = value.replace(/[\s-]/g, "");
  if (!PHONE.test(compact)) return null;
  return `+251${compact.replace(/^(\+251|0)/, "")}`;
}

async function post<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, data: await res.json().catch(() => null) as T | null };
  } catch {
    return { status: 0, data: null };
  }
}

export const NETWORK_ERROR = "We could not reach the service. Check your connection and try again.";

const LABEL: Record<PortalKey, string> = { consumer: "Consumer", business: "Business", woreda: "Woreda", subcity: "Sub-City", bureau: "City Bureau" };

export async function signIn(identifier: string, password: string, expect: PortalKey): Promise<AuthResult> {
  const phone = asPhone(identifier.trim());
  const res = phone
    ? await post("/api/auth/sign-in/phone-number", { phoneNumber: phone, password })
    : await post("/api/auth/sign-in/email", { email: identifier.trim(), password });
  if (res.status === 0) return { ok: false, error: NETWORK_ERROR };
  if (res.status === 429) return { ok: false, error: "Too many attempts. Wait a minute and try again." };
  // One message for an unknown account and a wrong password, so the form never confirms who has an account.
  if (res.status >= 400 && res.status < 500) return { ok: false, error: "The phone, email or password is not right." };
  if (res.status >= 500) return { ok: false, error: "The service had a problem. Try again in a moment." };

  const me = await fetch("/api/me", { credentials: "same-origin" }).then(r => r.json()).catch(() => null) as
    { ok: boolean; data?: { roles: RoleKey[] } } | null;
  const role = me?.data?.roles.find(r => ROLES[r]);
  if (!me?.ok || !role) { await signOut(); return { ok: false, error: "This account has no role yet. Ask the administrator." }; }
  const portal = ROLES[role].portal;
  if (portal !== expect) {
    await signOut();
    return { ok: false, error: `This is not a ${LABEL[expect]} account. Use the ${LABEL[portal]} tab.` };
  }
  return { ok: true, portal };
}

export async function signOut(): Promise<void> {
  await post("/api/auth/sign-out", {});
}

export async function sendOtp(phoneNumber: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await post("/api/auth/phone-number/send-otp", { phoneNumber });
  if (res.status === 0) return { ok: false, error: NETWORK_ERROR };
  if (res.status === 429) return { ok: false, error: "Too many codes requested. Wait a minute and try again." };
  return res.status < 300 ? { ok: true } : { ok: false, error: "We could not send the code. Check the phone number." };
}

export interface RegisterInput { phoneNumber: string; otp: string; fullName: string; password: string; preferredLanguage: "en" | "am" }

export async function registerConsumer(input: RegisterInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await post<{ error?: { code?: string; message?: string } }>("/api/auth/register-consumer", input);
  if (res.status === 0) return { ok: false, error: NETWORK_ERROR };
  if (res.status < 300) return { ok: true };
  if (res.data?.error?.code === "INVALID_OTP") return { ok: false, error: "That code is not right or has run out. Check it or ask for a new one." };
  if (res.status === 429) return { ok: false, error: "Too many attempts. Wait a minute and try again." };
  return { ok: false, error: res.data?.error?.message ?? "We could not create the account. Check what you typed and try again." };
}
