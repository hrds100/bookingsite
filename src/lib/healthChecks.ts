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
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    if (!error) return healthyResult(name, label, 'Connected and responding');
    return downResult(name, label, `Database error: ${error.message}`);
  } catch {
    return downResult(name, label, 'Unable to reach the database');
  }
}

/* ── execution data cache ────────────────────────────── */

let lastExecutionData: Record<string, ExecutionEntry[]> = {};

export function getExecutionData(): Record<string, ExecutionEntry[]> {
  return lastExecutionData;
}

export function getLatestExecution(workflowName: string): ExecutionEntry | null {
  for (const entries of Object.values(lastExecutionData)) {
    const match = entries.find(e => e.workflowName === workflowName);
    if (match) return match;
  }
  return null;
}

export function getAllExecutionsForFlow(flow: FlowDef): ExecutionEntry[] {
  const names = new Set(flow.steps.map(s => s.workflowName).filter(Boolean));
  const all: ExecutionEntry[] = [];
  for (const entries of Object.values(lastExecutionData)) {
    for (const entry of entries) {
      if (names.has(entry.workflowName)) all.push(entry);
    }
  }
  return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function checkEmailService(): Promise<HealthCheckResult> {
  const name = 'email';
  const label = 'Email Notifications';

  const supabaseUrl = typeof window !== 'undefined'
    ? (window as unknown as Record<string, string>).__SUPABASE_URL__
    : undefined;
  const url = `${supabaseUrl ?? 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/nfs-send-email`;

  const { signal, clear } = makeController(5_000);
  try {
    // OPTIONS ping — just checks the function is reachable
    const res = await fetch(url, { method: 'OPTIONS', signal });
    clear();
    if (res.ok || res.status === 200 || res.status === 204) {
      return healthyResult(name, label, 'Email edge function reachable');
    }
    return downResult(name, label, `Edge function returned ${res.status}`);
  } catch {
    clear();
    return downResult(name, label, 'Unable to reach email edge function');
  }
}

export async function checkUptimeRobot(): Promise<HealthCheckResult> {
  const name = 'uptimerobot';
  const label = 'Uptime Monitoring';
  const { signal, clear } = makeController();
  try {
    const res = await fetch(
      'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/uptimerobot-health',
      { signal },
    );
    clear();
    if (!res.ok) return downResult(name, label, 'Uptime monitoring proxy returned an error');
    const json = await res.json();
    const up: number = json?.up ?? 0;
    const total: number = json?.total ?? 0;
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
  { key: 'email', name: 'Email Notifications', icon: 'Mail', check: checkEmailService },
  { key: 'uptimerobot', name: 'Uptime Monitoring', icon: 'Activity', check: checkUptimeRobot },
];

/* ── flow definitions ────────────────────────────────── */

export interface ExecutionEntry {
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'running' | 'waiting' | 'crashed';
  workflowName: string;
  duration: number | null;
}

export interface FlowStep {
  label: string;
  dependsOn: string;
  workflowName?: string; // n8n workflow name for execution data
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
      { label: 'Guest Notified', dependsOn: 'email' },
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
