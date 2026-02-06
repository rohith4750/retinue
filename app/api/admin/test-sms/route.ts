import { NextRequest, NextResponse } from 'next/server'
import { sendSms } from '@/lib/fast2sms'

/**
 * POST /api/admin/test-sms
 * Send a test SMS to a given number.
 * Body: { "phone": "9999999999", "message": "Test message content" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phone, message } = body

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Missing phone or message in body' },
        { status: 400 }
      )
    }

    // Call the new sendSms function
    const result = await sendSms({
      numbers: [phone],
      message: message,
      // route: 'dlt_manual' // default
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
