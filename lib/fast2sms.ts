/**
 * Fast2SMS API – send OTP SMS (India)
 * Docs: https://www.fast2sms.com/dev/bulkV2 (route=otp, variables_values=OTP, numbers=phone)
 */

const FAST2SMS_BASE = 'https://www.fast2sms.com/dev/bulkV2'

function getApiKey(): string {
  const key = process.env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY_DEV
  if (!key) {
    throw new Error('FAST2SMS_API_KEY or FAST2SMS_API_KEY_DEV is not set')
  }
  return key
}

/**
 * Send OTP to Indian mobile via Fast2SMS.
 * @param phone - 10-digit mobile (no +91)
 * @param code - 4–10 digit OTP (numeric string)
 */
export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; message?: string }> {
  const apiKey = getApiKey()
  const normalizedPhone = phone.replace(/\D/g, '')
  if (normalizedPhone.length !== 10) {
    return { ok: false, message: 'Phone must be 10 digits' }
  }

  const body = new URLSearchParams({
    route: 'otp',
    variables_values: code,
    numbers: normalizedPhone,
    flash: '0',
  })

  try {
    const res = await fetch(FAST2SMS_BASE, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    // Fast2SMS returns { return: true, request_id: "..." } on success
    const ok = res.ok && (data.return === true || data.return === 'true')
    const errorMsg =
      (data.message as string) ||
      (data.msg as string) ||
      (data.reason as string) ||
      (data.error as string) ||
      (Array.isArray(data.message) ? (data.message as string[]).join(', ') : null) ||
      `HTTP ${res.status}`

    if (!ok) {
      console.error('[Fast2SMS] Send failed:', {
        status: res.status,
        phone: normalizedPhone.slice(0, 3) + '****' + normalizedPhone.slice(-2),
        response: data,
      })
    }

    return {
      ok,
      message: ok ? undefined : (errorMsg || 'Failed to send SMS'),
    }
  } catch (err: any) {
    console.error('[Fast2SMS] Request error:', err?.message || err)
    return { ok: false, message: err.message || 'Failed to send SMS' }
  }
}
