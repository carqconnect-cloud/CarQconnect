import https from 'node:https';
import { env } from '../../config/env';
import { normalizeIndianPhone } from './fast2sms.service';

export interface Msg91Result {
  success: boolean;
  message?: string;
  requestId?: string;
  error?: string;
  phone?: string;
  debug?: any;
}

function postJson(
  url: string,
  headers: Record<string, string>,
  bodyObj: any,
): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(bodyObj);
      const parsedUrl = new URL(url);
      const req = https.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        },
        (res) => {
          let str = '';
          res.on('data', (chunk) => (str += chunk));
          res.on('end', () => {
            let data: any = null;
            try {
              data = JSON.parse(str);
            } catch {
              data = { rawText: str };
            }
            resolve({ status: res.statusCode || 200, data, raw: str });
          });
        },
      );

      req.on('error', (err) => {
        resolve({ status: 500, data: { error: err.message }, raw: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 408, data: { error: 'Request timeout' }, raw: 'Request timeout' });
      });

      req.write(payload);
      req.end();
    } catch (err: any) {
      resolve({ status: 500, data: { error: err.message }, raw: err.message });
    }
  });
}

class Msg91Service {
  private get authKey(): string {
    return (
      env.MSG91_AUTH_KEY ||
      process.env.MSG91_Auth_KEY ||
      process.env.MSG91_AUTH_KEY ||
      '586327AoGUatJb6ae62f74P1'
    ).trim();
  }

  public get templateId(): string {
    return (
      env.MSG91_TEMPLATE_ID ||
      process.env.MSG91_TEMPLATE_ID ||
      '6ae63171fb5a744f1e0ad242'
    ).trim();
  }

  private get widgetId(): string {
    return (
      env.MSG91_WIDGET_ID ||
      process.env.MSG91_WIDGET_ID ||
      '366a4573706f383439313336'
    ).trim();
  }

  private get tokenAuth(): string {
    return (
      (env as any).MSG91_TOKEN_AUTH ||
      process.env.MSG91_TOKEN_AUTH ||
      '586327Tzg0Z1xZR6ae702f4P1'
    ).trim();
  }

  /**
   * Send an OTP code to a mobile number via MSG91 OTP Widget API.
   * Endpoint: POST https://api.msg91.com/api/v5/widget/sendOtp
   * Bypasses custom DLT template registration restrictions by using MSG91's pre-approved widget channels (SMS, WhatsApp, Email).
   */
  async sendOtpViaWidget(rawPhone: string, clientIp?: string): Promise<Msg91Result> {
    const cleanPhone = normalizeIndianPhone(rawPhone);
    if (!cleanPhone) {
      return { success: false, error: `Invalid mobile number: ${rawPhone}` };
    }

    const authKey = this.authKey;
    const widgetId = this.widgetId;
    const tokenAuth = this.tokenAuth;

    if (!authKey && !tokenAuth) return { success: false, error: 'MSG91 credentials missing.' };
    if (!widgetId) return { success: false, error: 'MSG91_WIDGET_ID is missing.' };

    const formattedMobile = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : `91${cleanPhone}`;

    const attempts: any[] = [];

    // Attempt 1: Official Server-Side standard (authkey in headers, { widgetId, identifier } in body)
    if (authKey) {
      const res1 = await postJson(
        'https://api.msg91.com/api/v5/widget/sendOtp',
        { authkey: authKey },
        { widgetId, identifier: formattedMobile },
      );
      attempts.push({ mode: 'authkey-standard', status: res1.status, data: res1.data });
      if (
        res1.status === 200 &&
        (res1.data?.type === 'success' || res1.data?.status === 'success' || res1.data?.reqId)
      ) {
        const reqId =
          res1.data?.reqId ||
          res1.data?.request_id ||
          (typeof res1.data?.message === 'string' && res1.data.message.length > 10
            ? res1.data.message
            : undefined);
        console.log(
          `[MSG91 Widget] ✅ OTP dispatched via standard authkey to ${formattedMobile}. Request ID: ${reqId || 'N/A'}`,
        );
        return {
          success: true,
          requestId: reqId,
          message: res1.data?.message || 'OTP sent successfully',
          phone: formattedMobile,
          debug: { attempts },
        };
      }
    }

    // Attempt 2: Token-based authentication (tokenAuth in body, no authkey header)
    if (tokenAuth) {
      const bodyPayload2: any = { widgetId, tokenAuth, identifier: formattedMobile };
      if (clientIp) bodyPayload2.userIp = clientIp;
      const res2 = await postJson(
        'https://api.msg91.com/api/v5/widget/sendOtp',
        {},
        bodyPayload2,
      );
      attempts.push({ mode: 'tokenAuth', status: res2.status, data: res2.data });
      if (
        res2.status === 200 &&
        (res2.data?.type === 'success' || res2.data?.status === 'success' || res2.data?.reqId)
      ) {
        const reqId =
          res2.data?.reqId ||
          res2.data?.request_id ||
          (typeof res2.data?.message === 'string' && res2.data.message.length > 10
            ? res2.data.message
            : undefined);
        console.log(
          `[MSG91 Widget] ✅ OTP dispatched via tokenAuth to ${formattedMobile}. Request ID: ${reqId || 'N/A'}`,
        );
        return {
          success: true,
          requestId: reqId,
          message: res2.data?.message || 'OTP sent successfully',
          phone: formattedMobile,
          debug: { attempts },
        };
      }
    }

    // Attempt 3: Combined (authkey header + tokenAuth in body)
    if (authKey && tokenAuth) {
      const res3 = await postJson(
        'https://api.msg91.com/api/v5/widget/sendOtp',
        { authkey: authKey },
        { widgetId, tokenAuth, identifier: formattedMobile },
      );
      attempts.push({ mode: 'combined', status: res3.status, data: res3.data });
      if (
        res3.status === 200 &&
        (res3.data?.type === 'success' || res3.data?.status === 'success' || res3.data?.reqId)
      ) {
        const reqId =
          res3.data?.reqId ||
          res3.data?.request_id ||
          (typeof res3.data?.message === 'string' && res3.data.message.length > 10
            ? res3.data.message
            : undefined);
        console.log(
          `[MSG91 Widget] ✅ OTP dispatched via combined mode to ${formattedMobile}. Request ID: ${reqId || 'N/A'}`,
        );
        return {
          success: true,
          requestId: reqId,
          message: res3.data?.message || 'OTP sent successfully',
          phone: formattedMobile,
          debug: { attempts },
        };
      }
    }

    const lastAttempt = attempts[attempts.length - 1];
    const errMsg =
      lastAttempt?.data?.message ||
      lastAttempt?.data?.error ||
      'All MSG91 widget attempts failed';
    console.warn(`[MSG91 Widget ⚠️] All dispatch attempts failed:`, attempts);

    return {
      success: false,
      error: errMsg,
      phone: formattedMobile,
      debug: { attempts },
    };
  }

  /**
   * Send an OTP code to a mobile number via MSG91 OTP Widget API.
   * Uses MSG91's pre-approved DLT setup for guaranteed delivery across channels (SMS/WhatsApp).
   * Bypasses custom DLT registration requirements and zero balance issues on transactional routes.
   */
  async sendOtpSms(rawPhone: string, _otp?: string, clientIp?: string): Promise<Msg91Result> {
    const cleanPhone = normalizeIndianPhone(rawPhone);
    if (!cleanPhone) {
      console.warn(`[MSG91] Invalid Indian mobile number format: "${rawPhone}"`);
      return {
        success: false,
        error: `Invalid Indian mobile number: ${rawPhone}. Must be 10 digits.`,
      };
    }

    return this.sendOtpViaWidget(cleanPhone, clientIp);
  }

  /**
   * Verify an OTP entered by the user against MSG91 OTP Widget.
   * Endpoint: POST https://api.msg91.com/api/v5/widget/verifyOtp
   */
  async verifyOtpViaWidget(reqId: string, otp: string): Promise<Msg91Result> {
    const authKey = this.authKey;
    const widgetId = this.widgetId;
    const tokenAuth = this.tokenAuth;

    if ((!authKey && !tokenAuth) || !widgetId || !reqId) {
      return { success: false, error: 'Missing authKey/tokenAuth, widgetId, or reqId' };
    }

    const cleanOtp = String(otp || '').trim();

    // Attempt 1: Standard with authkey
    if (authKey) {
      const res1 = await postJson(
        'https://api.msg91.com/api/v5/widget/verifyOtp',
        { authkey: authKey },
        { widgetId, reqId, otp: cleanOtp },
      );
      if (res1.status === 200 && (res1.data?.type === 'success' || res1.data?.status === 'success')) {
        return { success: true, message: res1.data?.message || 'OTP verified successfully via MSG91' };
      }
    }

    // Attempt 2: With tokenAuth
    if (tokenAuth) {
      const res2 = await postJson(
        'https://api.msg91.com/api/v5/widget/verifyOtp',
        {},
        { widgetId, reqId, otp: cleanOtp, tokenAuth },
      );
      if (res2.status === 200 && (res2.data?.type === 'success' || res2.data?.status === 'success')) {
        return { success: true, message: res2.data?.message || 'OTP verified successfully via MSG91' };
      }
    }

    return {
      success: false,
      error: 'Invalid OTP',
    };
  }

  /**
   * Resend an OTP via a specific channel ('12' for WhatsApp, '4' for Voice, '11' for SMS).
   * Endpoint: POST https://api.msg91.com/api/v5/widget/retryOtp
   */
  async retryOtpViaWidget(reqId: string, retryChannel: string = '11'): Promise<Msg91Result> {
    const authKey = this.authKey;
    const widgetId = this.widgetId;
    const tokenAuth = this.tokenAuth;

    if ((!authKey && !tokenAuth) || !widgetId || !reqId) {
      return { success: false, error: 'Missing authKey/tokenAuth, widgetId, or reqId' };
    }

    if (authKey) {
      const res1 = await postJson(
        'https://api.msg91.com/api/v5/widget/retryOtp',
        { authkey: authKey },
        { widgetId, reqId, retryChannel },
      );
      if (res1.status === 200 && (res1.data?.type === 'success' || res1.data?.status === 'success')) {
        return {
          success: true,
          message: res1.data?.message || 'OTP resent successfully via MSG91',
          requestId: reqId,
        };
      }
    }

    if (tokenAuth) {
      const res2 = await postJson(
        'https://api.msg91.com/api/v5/widget/retryOtp',
        {},
        { widgetId, reqId, retryChannel, tokenAuth },
      );
      if (res2.status === 200 && (res2.data?.type === 'success' || res2.data?.status === 'success')) {
        return {
          success: true,
          message: res2.data?.message || 'OTP resent successfully via MSG91',
          requestId: reqId,
        };
      }
    }

    return {
      success: false,
      error: 'Failed to resend OTP via MSG91',
    };
  }
}

export const msg91Service = new Msg91Service();
