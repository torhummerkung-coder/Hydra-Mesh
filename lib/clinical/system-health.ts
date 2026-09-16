// Process-local observations, not a fleet health monitor. Silence becomes unknown.
export type HealthState = 'healthy' | 'degraded' | 'safety_degraded' | 'unavailable' | 'unknown';
const observed = new Map<string, { state: HealthState; updatedAt: number }>();
const COMPONENTS = ['history', 'risk', 'companion', 'auditor', 'review_queue', 'persistence', 'outbox', 'security_queue'];
export function recordComponentHealth(component: string, state: HealthState): void {
  observed.set(component, { state, updatedAt: Date.now() });
}
export function markDegraded(): void { recordComponentHealth('companion', 'degraded'); }
export function getComponentHealth() {
  return Object.fromEntries(COMPONENTS.map(name => {
    const last = observed.get(name);
    return [name, { state: !last || Date.now() - last.updatedAt > 300000 ? 'unknown' : last.state, updatedAt: last ? new Date(last.updatedAt).toISOString() : null }];
  }));
}
export function getSystemHealth(): HealthState {
  const c = getComponentHealth();
  if (['risk', 'review_queue', 'auditor'].some(n => ['unavailable', 'safety_degraded'].includes(c[n].state))) return 'safety_degraded';
  const states = Object.values(c).map(v => v.state);
  if (states.includes('unavailable')) return 'unavailable';
  if (states.includes('degraded')) return 'degraded';
  if (states.includes('unknown')) return 'unknown';
  return 'healthy';
}
