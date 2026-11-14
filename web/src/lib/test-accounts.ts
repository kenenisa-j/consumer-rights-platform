import { DEV_TEST_ACCOUNTS, DEV_TEST_PASSWORD, type DevTestAccount } from "@consumer-rights/contracts";
import { showTestAccounts } from "./config";

export type UiTestAccount = DevTestAccount & { password: string };

/** Server side. The test accounts and their shared password reach the browser only when the dev flag is on. */
export function testAccountsForUi(): readonly UiTestAccount[] {
  return showTestAccounts() ? DEV_TEST_ACCOUNTS.map(a => ({ ...a, password: DEV_TEST_PASSWORD })) : [];
}
