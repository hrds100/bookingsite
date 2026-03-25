/**
 * Email alerts helper for monitoring failures.
 *
 * Sends a notification via the shared n8n webhook when monitoring
 * tests detect critical failures (e.g. homepage down, auth broken).
 *
 * Usage:
 *   await sendAlert({ subject: '...', body: '...' });
 *
 * The n8n webhook URL is read from the N8N_ALERT_WEBHOOK_URL env var.
 * If the var is missing the call is a silent no-op so CI never breaks
 * just because alerting isn't configured yet.
 */

interface AlertPayload {
  subject: string;
  body: string;
  app?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const webhookUrl = process.env.N8N_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[alerts] N8N_ALERT_WEBHOOK_URL not set — skipping alert');
    return;
  }

  const data = {
    app: payload.app || 'bookingsite',
    severity: payload.severity || 'critical',
    subject: payload.subject,
    body: payload.body,
    timestamp: new Date().toISOString(),
    url: process.env.TEST_BASE_URL || 'https://nfstay.app',
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.log(`[alerts] Webhook returned ${res.status} — alert may not have been delivered`);
    }
  } catch (err) {
    console.log(`[alerts] Failed to send alert: ${(err as Error).message}`);
  }
}
