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

export type Fast2SmsParams = {
  /**
   * Message content or Template ID.
   * If using 'dlt' route, this is the message text (must match approved template).
   */
  message: string
  /**
   * Comma separated 10-digit mobile numbers.
   */
  numbers: string[]
  /**
   * Route to use. Defaults to 'dlt_manual' (for DLT templates).
   * Options: 'dlt_manual' | 'v3' | 'otp'
   */
  route?: 'dlt_manual' | 'v3'
  /**
   * Variable values for DLT Content Template.
   * Pipe separated values e.g. "One|Two|Three"
   */
  variables_values?: string
  /**
   * Flash SMS (0 or 1). Default 0.
   */
  flash?: string
}

/**
 * Send general SMS via Fast2SMS (requires DLT registration).
 */
export async function sendSms(params: Fast2SmsParams): Promise<{ ok: boolean; message?: string }> {
  const apiKey = getApiKey()
  
  // Validate numbers
  const validNumbers = params.numbers
    .map(n => n.replace(/\D/g, ''))
    .filter(n => n.length === 10)

  if (validNumbers.length === 0) {
    return { ok: false, message: 'No valid 10-digit phone numbers provided' }
  }

  const body = new URLSearchParams({
    route: params.route || 'dlt_manual',
    message: params.message,
    numbers: validNumbers.join(','),
    flash: params.flash || '0',
  })

  // specific handling for different routes if needed, but 'dlt_manual' generally takes 'message'
  if (params.variables_values) {
      body.append('variables_values', params.variables_values)
  }

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
    const ok = res.ok && (data.return === true || data.return === 'true')
    
    const errorMsg =
      (data.message as string) ||
      (data.msg as string) ||
      (data.reason as string) ||
      (data.error as string) ||
      (Array.isArray(data.message) ? (data.message as string[]).join(', ') : null) ||
      `HTTP ${res.status}`

    if (!ok) {
      console.error('[Fast2SMS] General Send failed:', {
        status: res.status,
        numbers: validNumbers.map(n => n.slice(0, 3) + '****' + n.slice(-2)).join(','),
        response: data,
      })
    }

    return {
      ok,
      message: ok ? undefined : (errorMsg || 'Failed to send SMS'),
    }
  } catch (err: any) {
    console.error('[Fast2SMS] General Request error:', err?.message || err)
    return { ok: false, message: err.message || 'Failed to send SMS' }
  }
}
