/**
 * SMS Provider Abstraction
 *
 * Defines the contract for sending transactional SMS notifications and OTP codes.
 */
export interface SmsProvider {
  /**
   * Dispatches an OTP verification code to the target E.164 phone number.
   *
   * @param phoneNumber E.164 formatted phone number (e.g. +251911223344)
   * @param code Numeric or alphanumeric OTP code
   */
  sendOtp(phoneNumber: string, code: string): Promise<void>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';
