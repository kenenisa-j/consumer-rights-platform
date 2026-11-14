/**
 * Development only. Fictional accounts created by `npm run db:seed` and offered in the sign-in forms as a
 * test-account dropdown until real onboarding exists. The web app hides the dropdown in production and the
 * seed refuses to run when NODE_ENV is production. `identifier` is what that portal's sign-in form asks for:
 * a phone number for consumers, an email for everyone else.
 */
export const DEV_TEST_PASSWORD = "Test@12345";

export const DEV_TEST_ACCOUNTS = Object.freeze([
  { key: "consumer", role: "consumer", portal: "consumer", label: "Hirut Alemu (consumer)", fullName: "Hirut Alemu", phone: "+251900000412", email: "hirut.alemu@example.com", identifier: "+251900000412", office: null },
  { key: "business", role: "business_owner", portal: "business", label: "Gebriel Grain Traders (business owner)", fullName: "Yonas Gebriel", phone: "+251911000101", email: "owner@gebriel-grain.example.com", identifier: "owner@gebriel-grain.example.com", office: null },
  { key: "woreda_officer", role: "woreda_officer", portal: "woreda", label: "Woreda officer", fullName: "Meron Tadesse", phone: "+251911000201", email: "officer.woreda7@example.com", identifier: "officer.woreda7@example.com", office: "woreda" },
  { key: "woreda_admin", role: "woreda_admin", portal: "woreda", label: "Woreda administrator", fullName: "Dawit Haile", phone: "+251911000202", email: "admin.woreda7@example.com", identifier: "admin.woreda7@example.com", office: "woreda" },
  { key: "subcity_coordinator", role: "subcity_coordinator", portal: "subcity", label: "Sub-City coordinator", fullName: "Selam Bekele", phone: "+251911000301", email: "coordinator.akaki@example.com", identifier: "coordinator.akaki@example.com", office: "subcity" },
  { key: "bureau_officer", role: "bureau_officer", portal: "bureau", label: "City Bureau officer", fullName: "Tigist Worku", phone: "+251911000401", email: "officer.bureau@example.com", identifier: "officer.bureau@example.com", office: "bureau" },
  { key: "bureau_admin", role: "bureau_admin", portal: "bureau", label: "City Bureau administrator", fullName: "Abel Kebede", phone: "+251911000402", email: "admin.bureau@example.com", identifier: "admin.bureau@example.com", office: "bureau" },
  { key: "content_admin", role: "content_admin", portal: "bureau", label: "Content administrator", fullName: "Rahel Mulugeta", phone: "+251911000403", email: "content.bureau@example.com", identifier: "content.bureau@example.com", office: "bureau" }
]);
