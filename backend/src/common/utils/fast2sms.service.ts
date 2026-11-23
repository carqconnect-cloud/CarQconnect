import { env } from '../../config/env';

export interface Fast2SmsResult {
  success: boolean;
  statusCode?: number;
  message?: string;
  requestId?: string;
  error?: string;
  phone?: string;
}

/**
 * Normalizes an Indian phone number to a clean 10-digit format suitable for Fast2SMS.
 * Handles '+91', '91', leading '0', spaces, and hyphens.
 */
export function normalizeIndianPhone(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  // Reject dummy repeating digits (e.g. 0000000000, 9999999999)
  if (/^(\d)\1{9,}$/.test(digits)) return null;

  // Reject dummy sequential sequences
  if (['1234567890', '0123456789', '9876543210', '9898989898'].includes(digits)) {
    return null;
  }

  // 10 digits starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }
  // 11 digits starting with 0
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  // 12 digits starting with 91
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  // 13 digits starting with 091
  if (digits.length === 13 && digits.startsWith('091') && /^[6-9]/.test(digits.slice(3))) {
    return digits.slice(3);
  }
  // More than 10 digits: fallback to last 10 digits if valid mobile starter
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (/^[6-9]/.test(last10)) {
      return last10;
    }
  }

  return null;
}

class Fast2SmsService {
  private get apiKey(): string {
    return (env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY || '').trim();
  }

  /**
   * Send an OTP code to an Indian mobile number via Fast2SMS Bulk V2 OTP route.
   * Route: 'otp'
   * Fast2SMS delivers directly with high priority without requiring custom DLT template approvals.
   */
  async sendOtpSms(rawPhone: string, otp: string): Promise<Fast2SmsResult> {
    const cleanPhone = normalizeIndianPhone(rawPhone);
    if (!cleanPhone) {
      console.warn(`[Fast2SMS] Invalid Indian phone number format: "${rawPhone}"`);
      return {
        success: false,
        error: `Invalid Indian mobile number: ${rawPhone}. Must be 10 digits.`,
      };
    }

    const key = this.apiKey;
    if (!key) {
      console.warn('[Fast2SMS] FAST2SMS_API_KEY is not configured in environment.');
      return {
        success: false,
        error: 'FAST2SMS_API_KEY is missing.',
      };
    }

    try {
      console.log(`[Fast2SMS] Dispatching OTP (${otp}) to +91 ${cleanPhone}...`);

      const payload = {
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone,
      };

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: any = await response.json().catch(() => null);

      if (response.ok && data?.return === true) {
        const msg = Array.isArray(data.message)
          ? data.message.join(' ')
          : (data.message || 'SMS sent successfully');
        console.log(`[Fast2SMS] ✅ OTP successfully sent to ${cleanPhone}. Request ID: ${data.request_id || 'N/A'}`);
        return {
          success: true,
          requestId: data.request_id,
          message: msg,
          phone: cleanPhone,
        };
      }

      const statusCode = data?.status_code || response.status;
      const rawMessage = data?.message || 'Failed to dispatch SMS via Fast2SMS';

      if (statusCode === 996) {
        console.warn(
          `[Fast2SMS ⚠️] Status 996: Fast2SMS account requires website/app URL verification before using OTP route.\n` +
          `👉 Verification Steps: Login to https://www.fast2sms.com -> Dev API -> OTP SMS -> Enter your App/Website name & URL. Once submitted/approved, OTP SMS will deliver instantly.`,
        );
      } else {
        console.warn(`[Fast2SMS ❌] API response (Status ${statusCode}):`, rawMessage);
      }

      return {
        success: false,
        statusCode,
        error: rawMessage,
        phone: cleanPhone,
      };
    } catch (err: any) {
      console.error(`[Fast2SMS] Error while sending OTP to ${cleanPhone}:`, err?.message || err);
      return {
        success: false,
        error: err?.message || 'Network error connecting to Fast2SMS',
        phone: cleanPhone,
      };
    }
  }

  /**
   * Check Fast2SMS wallet balance and remaining credits.
   */
  async checkWallet(): Promise<{ success: boolean; wallet?: string; smsCount?: number; error?: string }> {
    const key = this.apiKey;
    if (!key) return { success: false, error: 'No FAST2SMS_API_KEY configured' };

    try {
      const response = await fetch('https://www.fast2sms.com/dev/wallet', {
        headers: { authorization: key },
      });
      const data: any = await response.json().catch(() => null);
      if (response.ok && data?.return === true) {
        return {
          success: true,
          wallet: data.wallet,
          smsCount: Number(data.sms_count || 0),
        };
      }
      return { success: false, error: data?.message || 'Failed to fetch wallet' };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
}

export const fast2smsService = new Fast2SmsService();

