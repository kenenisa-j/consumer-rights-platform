import type { PortalKey, RoleKey } from "./index.js";

/** Development only: fictional accounts offered as a test-account dropdown in the sign-in forms. */
export interface DevTestAccount {
  key: string;
  role: RoleKey;
  portal: PortalKey;
  label: string;
  fullName: string;
  phone: string;
  email: string;
  /** What that portal's sign-in form asks for. */
  identifier: string;
  office: "woreda" | "subcity" | "bureau" | null;
}
export declare const DEV_TEST_PASSWORD: string;
export declare const DEV_TEST_ACCOUNTS: readonly DevTestAccount[];
