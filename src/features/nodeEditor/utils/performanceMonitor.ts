/**
 * Development-only performance monitoring utilities for Story 4.10.
 * These functions are no-ops in production builds (tree-shaken by bundler).
 *
 * AC7: Performance monitoring — hydration timing and subscription tracking.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Measure the duration of an async hydration operation.
 * Logs a warning when the measured time exceeds the given threshold.
 *
 * @param ledgerId       - Ledger being hydrated (used in log labels)
 * @param fn             - Async function to measure
 * @param warnThresholdMs - Warn if duration exceeds this (default: 100ms)
 */
export async function measureHydration<T>(
  ledgerId: string,
  fn: () => Promise<T>,
  warnThresholdMs = 100
): Promise<T> {
  if (!IS_DEV) return fn();

  const label = `[Hydration] ${ledgerId}`;
  performance.mark(`${label}-start`);

  try {
    const result = await fn();
    performance.mark(`${label}-end`);
    const measure = performance.measure(label, `${label}-start`, `${label}-end`);
    const duration = measure.duration;

    if (duration > warnThresholdMs) {
      console.warn(
        `[PerformanceMonitor] Slow hydration for ledger "${ledgerId}": ${duration.toFixed(2)}ms ` +
          `(threshold: ${warnThresholdMs}ms)`
      );
    } else {
      console.debug(
        `[PerformanceMonitor] Hydrated ledger "${ledgerId}" in ${duration.toFixed(2)}ms`
      );
    }

    return result;
  } finally {
    // Clean up performance entries to avoid memory accumulation
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
  }
}

/**
 * Log current subscription count.
 * Call after subscribe/unsubscribe operations in development.
 *
 * @param activeCount   - Number of active PouchDB subscriptions
 * @param consumerCount - Total number of node consumers
 */
export function logSubscriptionCount(activeCount: number, consumerCount: number): void {
  if (!IS_DEV) return;
  console.debug(
    `[PerformanceMonitor] Active PouchDB subscriptions: ${activeCount}, ` +
      `total consumers: ${consumerCount}`
  );
}

/**
 * Log multi-ledger concurrent hydration results.
 *
 * @param ledgerCount     - Number of ledgers hydrated
 * @param durationMs      - Total duration in milliseconds
 */
export function logHydrationSummary(ledgerCount: number, durationMs: number): void {
  if (!IS_DEV) return;
  console.log(
    `[PerformanceMonitor] Hydrated ${ledgerCount} ledger(s) concurrently in ${durationMs.toFixed(2)}ms`
  );
}
