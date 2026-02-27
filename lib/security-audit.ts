type SecuritySeverity = 'info' | 'warn' | 'critical'

type SecurityAuditEvent = {
  event: string
  severity: SecuritySeverity
  ip?: string
  identity?: string
  details?: Record<string, unknown>
  timestamp?: string
}

export async function recordSecurityEvent(payload: SecurityAuditEvent) {
  const event = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  }

  const logLine = `[SECURITY_AUDIT] ${JSON.stringify(event)}`
  if (event.severity === 'critical' || event.severity === 'warn') {
    console.warn(logLine)
  } else {
    console.info(logLine)
  }

  const webhook = process.env.SECURITY_ALERT_WEBHOOK_URL
  if (!webhook) return
  if (event.severity === 'info') return

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (error) {
    console.error('Failed to send security alert webhook:', error)
  }
}
