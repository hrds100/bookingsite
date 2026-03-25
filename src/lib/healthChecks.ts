/**
 * Health check utilities for monitoring external services.
 * Each check returns a standardised result — never throws.
 */

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  label: string;
  lastChecked: Date;
  details?: string;
}

/* ── helpers ─────────────────────────────────────────── */

function makeController(ms = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function downResult(name: string, label: string, details: string): HealthCheckResult {
  return { name, status: 'down', label, lastChecked: new Date(), details };
}

function healthyResult(name: string, label: string, details?: string): HealthCheckResult {
  return { name, status: 'healthy', label, lastChecked: new Date(), details };
}

/* ── individual checks ───────────────────────────────── */

export async function checkSupabase(): Promise<HealthCheckResult> {
  const name = 'supabase';
  const label = 'Database & Login';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { signal, clear } = makeController();
  try {
    const headers: Record<string, string> = {};
    if (anonKey) {
      headers['apikey'] = anonKey;
      headers['Authorization'] = `Bearer ${anonKey}`;
    }
    const res = await fetch(
      'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/health',
      { signal, headers },
    );
    clear();
    if (!res.ok) return downResult(name, label, 'Database returned an error');
    const json = await res.json();
    if (json?.status === 'ok') return healthyResult(name, label, 'Connected and responding');
    return { name, status: 'degraded', label, lastChecked: new Date(), details: 'Responded but status unclear' };
  } catch {
    clear();
    return downResult(name, label, 'Unable to reach the database');
  }
}

export async function checkN8n(): Promise<HealthCheckResult> {
  const name = 'n8n';
  const label = 'Automations';

  const { signal, clear } = makeController();
  try {
    const res = await fetch(
      'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/n8n-health',
      { signal },
    );
    clear();
    if (!res.ok) return downResult(name, label, 'Automation health proxy returned an error');
    const json = await res.json();
    const allWorkflows: { name: string; active: boolean }[] = json?.workflows ?? [];
    const prodWorkflows = allWorkflows.filter((w) =>
      /^(NFsTay|marketplace10|nfs-)/i.test(w.name)
    );
    const prodActive = prodWorkflows.filter((w) => w.active).length;
    const prodTotal = prodWorkflows.length;
    const totalActive: number = json?.active ?? 0;
    if (prodTotal === 0)
      return healthyResult(name, label, `${totalActive} workflows active`);
    if (prodActive === prodTotal)
      return healthyResult(name, label, `All ${prodActive} production workflows active (${totalActive} total)`);
    const inactive = prodWorkflows.filter((w) => !w.active).map((w) => w.name);
    return { name, status: 'degraded', label, lastChecked: new Date(), details: `${prodActive} of ${prodTotal} production workflows active. Inactive: ${inactive.join(', ')}` };
  } catch {
    clear();
    return downResult(name, label, 'Unable to connect to automation engine');
  }
}

export async function checkUptimeRobot(): Promise<HealthCheckResult> {
  const name = 'uptimerobot';
  const label = 'Uptime Monitoring';
  const apiKey = import.meta.env.VITE_UPTIMEROBOT_API_KEY;
  if (!apiKey) return downResult(name, label, 'Uptime monitoring key not configured');

  const { signal, clear } = makeController();
  try {
    const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, format: 'json' }),
      signal,
    });
    clear();
    if (!res.ok) return downResult(name, label, 'Uptime service returned an error');
    const json = await res.json();
    const monitors: { status: number }[] = json?.monitors ?? [];
    const up = monitors.filter((m) => m.status === 2).length;
    const total = monitors.length;
    if (total === 0) return downResult(name, label, 'No monitors configured');
    if (up === total) return healthyResult(name, label, `All ${total} monitors up`);
    const downCount = total - up;
    return { name, status: 'degraded', label, lastChecked: new Date(), details: `${downCount} of ${total} monitors reporting issues` };
  } catch {
    clear();
    return downResult(name, label, 'Unable to connect to uptime service');
  }
}

/* ── service definitions ─────────────────────────────── */

export interface ServiceDef {
  key: string;
  name: string;
  icon: string;
  check: (() => Promise<HealthCheckResult>) | (() => HealthCheckResult);
}

export const BOOKING_SERVICES: ServiceDef[] = [
  { key: 'supabase', name: 'Database & Login', icon: 'Database', check: checkSupabase },
  { key: 'stripe', name: 'Payments', icon: 'CreditCard', check: () => healthyResult('stripe', 'Payments', 'Stripe is managed externally — check Stripe dashboard for issues') },
  { key: 'n8n', name: 'Automations', icon: 'Workflow', check: checkN8n },
  { key: 'uptimerobot', name: 'Uptime Monitoring', icon: 'Activity', check: checkUptimeRobot },
];

/* ── flow definitions ────────────────────────────────── */

export interface FlowStep {
  label: string;
  dependsOn: string;
}

export interface FlowDef {
  name: string;
  steps: FlowStep[];
}

export const BOOKING_FLOWS: FlowDef[] = [
  {
    name: 'Booking Flow',
    steps: [
      { label: 'Property Selected', dependsOn: 'supabase' },
      { label: 'Stripe Checkout', dependsOn: 'stripe' },
      { label: 'Booking Confirmed', dependsOn: 'supabase' },
      { label: 'Host Notified', dependsOn: 'n8n' },
    ],
  },
];

/* ── run all checks ──────────────────────────────────── */

export async function runAllChecks(
  services: ServiceDef[],
): Promise<Map<string, HealthCheckResult>> {
  const results = new Map<string, HealthCheckResult>();
  const promises = services.map(async (svc) => {
    const result = await svc.check();
    results.set(svc.key, result);
  });
  await Promise.all(promises);
  return results;
}
