/**
 * Security tests for MockSmsService (SEC-09: Sanitize Mock SMS Logs).
 *
 * Verifies that:
 * 1. Plaintext OTP codes are never logged to console or logger streams.
 * 2. Complete, unmasked phone numbers are never logged.
 * 3. Masked phone number representation is emitted for operational diagnostics.
 * 4. getLastOtpFor() preserves exact 6-digit OTP in memory for test assertions.
 * 5. Production mode refuses execution and does not leak credentials in error logs.
 */
import test from "node:test";
import assert from "node:assert/strict";

let MockSmsService;

test("setup: import compiled MockSmsService", async () => {
  const mod = await import("../backend/dist/lib/auth/sms/mock-sms.service.js");
  MockSmsService = mod.MockSmsService || mod.default?.MockSmsService;
  assert.ok(MockSmsService, "MockSmsService must be exported from compiled build");
});

test("SEC-09: sendOtp logs sanitized message without plaintext OTP or complete phone number", async () => {
  const service = new MockSmsService({
    get: (key, fallback) => (key === "NODE_ENV" ? "test" : fallback),
  });

  const loggedMessages = [];
  service.logger.debug = (msg) => {
    loggedMessages.push(typeof msg === "string" ? msg : JSON.stringify(msg));
  };

  const secretOtp = "948201";
  const fullPhone = "+251911223344";

  await service.sendOtp(fullPhone, secretOtp);

  assert.ok(loggedMessages.length > 0, "A debug log must be emitted on OTP dispatch");

  for (const logMsg of loggedMessages) {
    // 1. Plaintext OTP must never appear
    assert.ok(
      !logMsg.includes(secretOtp),
      `Security violation: Log message contains plaintext OTP code (${secretOtp}): "${logMsg}"`
    );

    // 2. Full phone number must never appear
    assert.ok(
      !logMsg.includes(fullPhone),
      `Security violation: Log message contains complete phone number (${fullPhone}): "${logMsg}"`
    );

    // 3. Masked phone number should appear for diagnostic value
    assert.ok(
      logMsg.includes("+251****44"),
      `Log message must include masked phone number (+251****44): "${logMsg}"`
    );

    // 4. Redaction marker should be present
    assert.ok(
      logMsg.includes("[REDACTED]"),
      `Log message must indicate OTP is redacted: "${logMsg}"`
    );
  }
});

test("SEC-09: getLastOtpFor preserves exact 6-digit OTP in memory for automated test harness", async () => {
  const service = new MockSmsService({
    get: (key, fallback) => (key === "NODE_ENV" ? "test" : fallback),
  });

  const secretOtp = "654321";
  const phone = "+251922334455";

  await service.sendOtp(phone, secretOtp);

  const retrieved = service.getLastOtpFor(phone);
  assert.equal(retrieved, secretOtp, "getLastOtpFor must return the exact 6-digit OTP code");
  assert.equal(retrieved.length, 6, "OTP must remain exactly 6 characters");

  service.clearHistory();
  assert.equal(
    service.getLastOtpFor(phone),
    undefined,
    "clearHistory must clear dispatched OTPs"
  );
});

test("SEC-09: maskPhoneNumber correctly masks various phone numbers", () => {
  const service = new MockSmsService({
    get: (key, fallback) => fallback,
  });

  assert.equal(service.maskPhoneNumber("+251911223344"), "+251****44");
  assert.equal(service.maskPhoneNumber("+251999990001"), "+251****01");
  assert.equal(service.maskPhoneNumber("1234"), "****");
  assert.equal(service.maskPhoneNumber(""), "****");
});

test("SEC-09: production mode throws error and does not leak OTP or phone in error log", async () => {
  const service = new MockSmsService({
    get: (key, fallback) => (key === "NODE_ENV" ? "production" : fallback),
  });

  const errorLogs = [];
  service.logger.error = (msg) => {
    errorLogs.push(typeof msg === "string" ? msg : JSON.stringify(msg));
  };

  const secretOtp = "112233";
  const fullPhone = "+251933445566";

  await assert.rejects(
    () => service.sendOtp(fullPhone, secretOtp),
    /production SMS provider is not configured/
  );

  for (const logMsg of errorLogs) {
    assert.ok(!logMsg.includes(secretOtp), "Error log must not contain plaintext OTP");
    assert.ok(!logMsg.includes(fullPhone), "Error log must not contain full phone number");
  }

  assert.equal(
    service.getLastOtpFor(fullPhone),
    undefined,
    "getLastOtpFor must always return undefined in production mode"
  );
});
