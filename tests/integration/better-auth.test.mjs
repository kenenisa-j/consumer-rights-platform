import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setupTestDatabase } from "./test-db-setup.mjs";

process.env.NODE_ENV = "test";

let app;
let baseUrl;
let mockSms;
let testClient;
let testDatabaseUrl;

const TEST_PHONE_PREFIX = "+25199999";
const genPhone = (suffix) => `${TEST_PHONE_PREFIX}${String(suffix).padStart(4, "0")}`;
const createdUserIds = new Set();

/**
 * Parses a Better Auth signed cookie value into raw token and signature.
 * Format: "<rawToken>.<signature>" (URL-encoded or raw).
 */
function parseSignedCookie(cookieHeaderVal) {
  if (!cookieHeaderVal) return { rawToken: "", signature: "" };
  const decoded = decodeURIComponent(cookieHeaderVal);
  const dotIdx = decoded.indexOf(".");
  if (dotIdx === -1) {
    return { rawToken: decoded, signature: "" };
  }
  return {
    rawToken: decoded.slice(0, dotIdx),
    signature: decoded.slice(dotIdx + 1),
  };
}

/**
 * Strict database guard: authoritatively verifies active database in PostgreSQL is consumer_rights_test.
 * Fails closed immediately if connected to any other database (especially development or production).
 */
async function assertConnectedToTestDatabase(client) {
  const res = await client.query("SELECT current_database()");
  const dbName = res.rows[0]?.current_database;
  if (dbName !== "consumer_rights_test") {
    throw new Error(
      `CRITICAL DATABASE SAFETY GUARD: Expected connection to 'consumer_rights_test', but active database is '${dbName}'. Operations halted to protect non-test databases.`
    );
  }
}

/**
 * Cleanup using strictly exact user IDs tracked during the current test run.
 * Deletes only records in createdUserIds; no broad phone-prefix deletion queries.
 */
async function cleanupTrackedTestUsers(client) {
  if (!client || createdUserIds.size === 0) return;
  await assertConnectedToTestDatabase(client);

  const ids = Array.from(createdUserIds);
  await client.query("DELETE FROM users WHERE id = ANY($1::text[])", [ids]);
  createdUserIds.clear();
}

before(async () => {
  try {
    const dbSetup = await setupTestDatabase();
    testClient = dbSetup.testClient;
    testDatabaseUrl = dbSetup.testDatabaseUrl;

    await assertConnectedToTestDatabase(testClient);
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.NODE_ENV = "test";

    let mainModule;
    try {
      mainModule = await import("../../backend/dist/main.js");
    } catch (err) {
      throw new Error(
        `Backend build artifact not found at backend/dist/main.js (${err.message}). Run 'npm run build' before running integration tests.`
      );
    }

    const createNestApp = mainModule.createNestApp || mainModule.default?.createNestApp;
    if (!createNestApp) {
      throw new Error(
        "createNestApp is not exported from backend/dist/main.js. Run 'npm run build' after exporting createNestApp."
      );
    }

    app = await createNestApp();
    await app.listen(0, "127.0.0.1");

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}/api`;

    let smsModule;
    try {
      smsModule = await import("../../backend/dist/lib/auth/sms/sms.interface.js");
    } catch (err) {
      throw new Error(
        `SMS provider artifact not found at backend/dist/lib/auth/sms/sms.interface.js (${err.message}). Run 'npm run build'.`
      );
    }

    const SMS_PROVIDER = smsModule.SMS_PROVIDER || smsModule.default?.SMS_PROVIDER;
    mockSms = app.get(SMS_PROVIDER);
  } catch (err) {
    if (testClient) {
      await cleanupTrackedTestUsers(testClient).catch(() => { });
      await testClient.end().catch(() => { });
      testClient = null;
    }
    if (app) {
      await app.close().catch(() => { });
      app = null;
    }
    throw err;
  }
});

after(async () => {
  try {
    if (testClient) {
      await cleanupTrackedTestUsers(testClient);
    }
  } finally {
    try {
      if (testClient) {
        await testClient.end();
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  }
});

const postRegister = (body, clientIp = "10.0.1.1") =>
  fetch(`${baseUrl}/auth/register-consumer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-Client-IP": clientIp,
    },
    body: JSON.stringify(body),
  });

test("Scenario 1: Consumer registration creates User, Account, and CONSUMER role in PostgreSQL", async () => {
  const phone = genPhone(1);
  const password = "Password123!";

  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP must return HTTP 200");

  const otp = mockSms.getLastOtpFor(phone);
  assert.ok(otp && otp.length === 6, "Mock SMS provider must record a 6-digit OTP");

  const regRes = await postRegister(
    {
      phoneNumber: phone,
      otp,
      fullName: "Test Citizen One",
      password,
      preferredLanguage: "am",
    },
    "10.0.1.1"
  );
  const regBody = await regRes.json();
  assert.equal(
    regRes.status,
    201,
    `Registration must return HTTP 201 (status: ${regRes.status}, code: ${regBody?.error?.code || "NONE"}, msg: ${regBody?.error?.message || "NONE"})`
  );
  assert.ok(regBody?.data?.user?.phoneNumber, "Response must contain registered user");
  assert.equal(regBody.data.user.phoneNumber, phone);
  createdUserIds.add(regBody.data.user.id);

  // Verify real PostgreSQL rows
  const userRow = await testClient.query(
    "SELECT id, phone_number, full_name, phone_number_verified, status FROM users WHERE phone_number = $1",
    [phone]
  );
  assert.equal(userRow.rowCount, 1, "User row must exist in PostgreSQL");
  assert.equal(userRow.rows[0].phone_number_verified, true, "Phone must be marked verified");
  assert.equal(userRow.rows[0].status, "ACTIVE");

  const accountRow = await testClient.query(
    "SELECT id, provider_id, user_id, password FROM accounts WHERE user_id = $1",
    [userRow.rows[0].id]
  );
  assert.equal(accountRow.rowCount, 1, "Credential account must exist in PostgreSQL");
  assert.equal(accountRow.rows[0].provider_id, "credential");
  assert.ok(accountRow.rows[0].password && accountRow.rows[0].password.length > 20);

  const roleRow = await testClient.query(
    "SELECT ur.user_id, r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1",
    [userRow.rows[0].id]
  );
  assert.equal(roleRow.rowCount, 1, "UserRole must exist in PostgreSQL");
  assert.equal(roleRow.rows[0].code, "CONSUMER", "Role must be CONSUMER");
});

test("Scenario 2: Login establishes a real session and returns usable cookie", async () => {
  const phone = genPhone(2);
  const password = "Password123!";

  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP must return HTTP 200");

  const otp = mockSms.getLastOtpFor(phone);
  assert.ok(otp && otp.length === 6, "Mock SMS provider must record a 6-digit OTP");

  const regRes = await postRegister(
    {
      phoneNumber: phone,
      otp,
      fullName: "Test Citizen Two",
      password,
      preferredLanguage: "en",
    },
    "10.0.2.1"
  );
  const regBody = await regRes.json();
  assert.equal(
    regRes.status,
    201,
    `Registration must return HTTP 201 (status: ${regRes.status}, code: ${regBody?.error?.code || "NONE"}, msg: ${regBody?.error?.message || "NONE"})`
  );
  assert.ok(regBody?.data?.user?.id, "Registration response must include user ID");
  createdUserIds.add(regBody.data.user.id);

  // Perform login
  const loginRes = await fetch(`${baseUrl}/auth/sign-in/phone-number`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone, password }),
  });
  assert.equal(loginRes.status, 200, "Sign in must return HTTP 200");

  const cookies = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get("set-cookie")].filter(Boolean);

  const sessionCookie = cookies.find((c) => c.includes("better-auth.session_token="));
  assert.ok(sessionCookie, "Response must include better-auth.session_token cookie");

  const cookieVal = sessionCookie.split(";")[0].split("=")[1];
  const { rawToken, signature } = parseSignedCookie(cookieVal);
  assert.ok(rawToken, "Raw session token must be present");
  assert.ok(signature, "Session cookie must contain a signature");

  // Verify PostgreSQL sessions table using raw token
  const sessionRow = await testClient.query(
    "SELECT id, token, user_id, expires_at FROM sessions WHERE token = $1",
    [rawToken]
  );
  assert.equal(sessionRow.rowCount, 1, "Session row must exist in PostgreSQL");
  assert.equal(sessionRow.rows[0].user_id, regBody.data.user.id, "Session must belong to registered user");
  assert.ok(new Date(sessionRow.rows[0].expires_at) > new Date(), "Session must not be expired");
});

test("Scenario 3: Protected route succeeds with valid session cookie", async () => {
  const phone = genPhone(3);
  const password = "Password123!";

  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP must return HTTP 200");

  const otp = mockSms.getLastOtpFor(phone);
  assert.ok(otp && otp.length === 6, "Mock SMS provider must record a 6-digit OTP");

  const regRes = await postRegister(
    {
      phoneNumber: phone,
      otp,
      fullName: "Test Citizen Three",
      password,
      preferredLanguage: "am",
    },
    "10.0.3.1"
  );
  const regBody = await regRes.json();
  assert.equal(
    regRes.status,
    201,
    `Registration must return HTTP 201 (status: ${regRes.status}, code: ${regBody?.error?.code || "NONE"}, msg: ${regBody?.error?.message || "NONE"})`
  );
  assert.ok(regBody?.data?.user?.id, "Registration response must include user ID");
  createdUserIds.add(regBody.data.user.id);

  const cookies = regRes.headers.getSetCookie
    ? regRes.headers.getSetCookie()
    : [regRes.headers.get("set-cookie")].filter(Boolean);
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  // Call PermissionGuard protected route
  const protectedRes = await fetch(`${baseUrl}/auth/protected-test`, {
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  assert.equal(protectedRes.status, 200, "Protected route must return HTTP 200");
  const protectedBody = await protectedRes.json();
  assert.equal(protectedBody.data.authenticated, true);
  assert.ok(protectedBody.data.user.permissions.includes("complaints:read:own"));
});

test("Scenario 4: Suspended account receives HTTP 403 Forbidden", async () => {
  const phone = genPhone(4);
  const password = "Password123!";

  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP must return HTTP 200");

  const otp = mockSms.getLastOtpFor(phone);
  assert.ok(otp && otp.length === 6, "Mock SMS provider must record a 6-digit OTP");

  const regRes = await postRegister(
    {
      phoneNumber: phone,
      otp,
      fullName: "Test Citizen Four",
      password,
      preferredLanguage: "am",
    },
    "10.0.4.1"
  );
  const regBody = await regRes.json();
  assert.equal(
    regRes.status,
    201,
    `Registration must return HTTP 201 (status: ${regRes.status}, code: ${regBody?.error?.code || "NONE"}, msg: ${regBody?.error?.message || "NONE"})`
  );
  assert.ok(regBody?.data?.user?.id, "Registration response must include user ID");
  createdUserIds.add(regBody.data.user.id);

  const cookies = regRes.headers.getSetCookie
    ? regRes.headers.getSetCookie()
    : [regRes.headers.get("set-cookie")].filter(Boolean);
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  // Suspend user directly in PostgreSQL
  await testClient.query("UPDATE users SET status = 'SUSPENDED' WHERE phone_number = $1", [phone]);

  const protectedRes = await fetch(`${baseUrl}/auth/protected-test`, {
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  assert.equal(protectedRes.status, 403, "Suspended user must receive HTTP 403 Forbidden");
  const errBody = await protectedRes.json();
  assert.equal(errBody.error.code, "ACCOUNT_SUSPENDED");
});

test("Scenario 5: Logout invalidates session in PostgreSQL and revokes access", async () => {
  const phone = genPhone(5);
  const password = "Password123!";

  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP must return HTTP 200");

  const otp = mockSms.getLastOtpFor(phone);
  assert.ok(otp && otp.length === 6, "Mock SMS provider must record a 6-digit OTP");

  const regRes = await postRegister(
    {
      phoneNumber: phone,
      otp,
      fullName: "Test Citizen Five",
      password,
      preferredLanguage: "am",
    },
    "10.0.5.1"
  );
  const regBody = await regRes.json();
  assert.equal(
    regRes.status,
    201,
    `Registration must return HTTP 201 (status: ${regRes.status}, code: ${regBody?.error?.code || "NONE"}, msg: ${regBody?.error?.message || "NONE"})`
  );
  assert.ok(regBody?.data?.user?.id, "Registration response must include user ID");
  createdUserIds.add(regBody.data.user.id);

  const cookies = regRes.headers.getSetCookie
    ? regRes.headers.getSetCookie()
    : [regRes.headers.get("set-cookie")].filter(Boolean);
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

  const sessionCookie = cookies.find((c) => c.includes("better-auth.session_token="));
  assert.ok(sessionCookie, "Registration response must include session cookie");

  const cookieVal = sessionCookie.split(";")[0].split("=")[1];
  const { rawToken, signature } = parseSignedCookie(cookieVal);
  assert.ok(rawToken, "Raw session token must be present");
  assert.ok(signature, "Session cookie must contain a signature");

  // Verify session row exists in PostgreSQL BEFORE logout
  const preCheck = await testClient.query(
    "SELECT id FROM sessions WHERE token = $1",
    [rawToken]
  );
  assert.equal(preCheck.rowCount, 1, "Session row must exist in PostgreSQL prior to sign out");

  // Perform sign out
  const signOutRes = await fetch(`${baseUrl}/auth/sign-out`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  assert.equal(signOutRes.status, 200, "Sign out must return HTTP 200");

  // Verify PostgreSQL sessions table: previously existing session is deleted
  const sessionCheck = await testClient.query(
    "SELECT 1 FROM sessions WHERE token = $1",
    [rawToken]
  );
  assert.equal(sessionCheck.rowCount, 0, "Previously existing session must be removed from PostgreSQL after sign out");

  // Call protected route with revoked cookie
  const recheckRes = await fetch(`${baseUrl}/auth/protected-test`, {
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  assert.equal(recheckRes.status, 401, "Revoked session must receive HTTP 401 Unauthorized");
});

test("Scenario 6: Failure scenarios enforce security constraints", async () => {
  const phone = genPhone(6);
  const password = "Password123!";

  // 6a. Invalid OTP
  const otpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(otpRes.status, 200, "Send OTP for 6a must return HTTP 200");

  const badOtpRes = await postRegister(
    {
      phoneNumber: phone,
      otp: "000000",
      fullName: "Wrong OTP User",
      password,
      preferredLanguage: "am",
    },
    "10.0.6.1"
  );
  assert.equal(badOtpRes.status, 400, "Invalid OTP must return HTTP 400 Bad Request");
  const badOtpBody = await badOtpRes.json();
  assert.equal(badOtpBody.error.code, "INVALID_OTP");

  const noUserCheck = await testClient.query(
    "SELECT 1 FROM users WHERE phone_number = $1",
    [phone]
  );
  assert.equal(noUserCheck.rowCount, 0, "No user record must be created on invalid OTP");

  // 6b. Successful registration
  const validOtp = mockSms.getLastOtpFor(phone);
  assert.ok(validOtp && validOtp.length === 6, "Mock SMS provider must record a 6-digit OTP for valid registration");

  const goodRegRes = await postRegister(
    {
      phoneNumber: phone,
      otp: validOtp,
      fullName: "Valid User",
      password,
      preferredLanguage: "am",
    },
    "10.0.6.1"
  );
  const goodRegBody = await goodRegRes.json();
  assert.equal(
    goodRegRes.status,
    201,
    `Valid registration must return HTTP 201 (status: ${goodRegRes.status}, code: ${goodRegBody?.error?.code || "NONE"}, msg: ${goodRegBody?.error?.message || "NONE"})`
  );
  assert.ok(goodRegBody?.data?.user?.id, "Registration response must include user ID");
  createdUserIds.add(goodRegBody.data.user.id);

  // 6c. Already consumed OTP re-use
  const reusedOtpRes = await postRegister(
    {
      phoneNumber: phone,
      otp: validOtp,
      fullName: "Replay Attempt User",
      password,
      preferredLanguage: "am",
    },
    "10.0.6.1"
  );
  assert.equal(reusedOtpRes.status, 400, "Consumed OTP re-use must return HTTP 400");

  // 6d. Duplicate phone number registration
  const dupOtpRes = await fetch(`${baseUrl}/auth/phone-number/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone }),
  });
  assert.equal(dupOtpRes.status, 200, "Send OTP for duplicate test must return HTTP 200");

  const newOtpForExistingPhone = mockSms.getLastOtpFor(phone);
  assert.ok(newOtpForExistingPhone && newOtpForExistingPhone.length === 6, "Mock SMS must record OTP for duplicate check");

  const dupRes = await postRegister(
    {
      phoneNumber: phone,
      otp: newOtpForExistingPhone,
      fullName: "Duplicate User",
      password: "AnotherPassword123!",
      preferredLanguage: "am",
    },
    "10.0.6.1"
  );
  assert.equal(dupRes.status, 400, "Duplicate phone registration must fail with HTTP 400");
  const dupCountCheck = await testClient.query(
    "SELECT id FROM users WHERE phone_number = $1",
    [phone]
  );
  assert.equal(dupCountCheck.rowCount, 1, "Only 1 user row must exist for this phone number");

  // 6e. Invalid password login
  const badLoginRes = await fetch(`${baseUrl}/auth/sign-in/phone-number`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber: phone, password: "WrongPassword999!" }),
  });
  assert.equal(badLoginRes.status, 401, "Invalid password must return HTTP 401 Unauthorized");
});

test("Scenario 7: Security hardening – email sign-up disabled and registration rate limited", async () => {
  // 7a. SEC-01: Native Better Auth email sign-up must be rejected
  const emailSignUpRes = await fetch(`${baseUrl}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "intruder@example.com", password: "Password123!", name: "Intruder" }),
  });
  assert.equal(
    emailSignUpRes.status,
    400,
    `Email sign-up must return HTTP 400 (got ${emailSignUpRes.status})`
  );
  const emailBody = await emailSignUpRes.json();
  assert.equal(
    emailBody.code,
    "EMAIL_PASSWORD_SIGN_UP_DISABLED",
    `Expected EMAIL_PASSWORD_SIGN_UP_DISABLED, got: ${emailBody.code}`
  );

  // 7b. SEC-02: 6th request from the same IP within 60s must receive HTTP 429
  const rlIp = "192.168.200.77";
  for (let i = 1; i <= 5; i++) {
    const res = await postRegister(
      { phoneNumber: genPhone(700 + i), otp: "123456", fullName: `RL Tester ${i}`, password: "Password123!" },
      rlIp
    );
    assert.ok(
      res.status === 400 || res.status === 201,
      `Request ${i} must reach the handler (got ${res.status})`
    );
  }
  const blockedRes = await postRegister(
    { phoneNumber: genPhone(799), otp: "123456", fullName: "Blocked", password: "Password123!" },
    rlIp
  );
  assert.equal(blockedRes.status, 429, `6th request from same IP must receive HTTP 429 (got ${blockedRes.status})`);
  const blockedBody = await blockedRes.json();
  assert.equal(blockedBody.error.code, "RATE_LIMIT_EXCEEDED");
});
