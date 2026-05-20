import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { useErrorStore } from '@/stores/useErrorStore';

/**
 * Pub/sub subscription registry for PouchDB ledger changes feed.
 * AC7: Subscription sharing — multiple nodes referencing the same ledger
 * share ONE PouchDB changes subscription (reference counting).
 *
 * This is a module-level registry (like saveTimeoutId in useNodeStore) because
 * PouchDB subscriptions are not serializable and should not live in React state.
 */

type ChangeCallback = (change: PouchDB.Core.ChangesResponseChange<{}>) => void;

interface RegistryEntry {
  /** The active PouchDB changes feed */
  changes: PouchDB.Core.Changes<{}>;
  /** Per-consumer callbacks keyed by consumerId (e.g. nodeId) */
  consumers: Map<string, ChangeCallback>;
}

// Module-level registry: one entry per active ledger subscription
const registry = new Map<string, RegistryEntry>();

/**
 * Subscribe a consumer (node) to live changes for a ledger.
 * If a PouchDB subscription for this ledger already exists, it is reused.
 * Returns an unsubscribe function.
 *
 * @param ledgerId   - The ledger to subscribe to
 * @param consumerId - Unique ID for this consumer (e.g. node ID)
 * @param onChange   - Called on each PouchDB change event
 */
export function subscribeToLedger(
  ledgerId: string,
  consumerId: string,
  onChange: ChangeCallback
): () => void {
  const existing = registry.get(ledgerId);

  if (existing) {
    existing.consumers.set(consumerId, onChange);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[SubscriptionRegistry] Sharing subscription for ledger "${ledgerId}" ` +
          `(consumers: ${existing.consumers.size})`
      );
    }
    return () => _removeConsumer(ledgerId, consumerId);
  }

  // Create a new PouchDB changes feed for this ledger
  const consumers = new Map<string, ChangeCallback>([[consumerId, onChange]]);
  const activeProfileId = useProfileStore.getState().activeProfileId;

  if (!activeProfileId) {
    // No active profile — return a no-op unsubscribe
    console.warn('[SubscriptionRegistry] No active profile; skipping subscription for ledger:', ledgerId);
    return () => {};
  }

  const db = getProfileDb(activeProfileId);
  const changes = db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    selector: {
      type: 'entry',
      ledgerId,
      isDeleted: { $exists: false },
    },
  });

  changes.on('change', (change) => {
    // Broadcast to all registered consumers for this ledger
    const entry = registry.get(ledgerId);
    if (entry) {
      entry.consumers.forEach((cb) => cb(change));
    }
  });

  changes.on('error', (err: any) => {
    useErrorStore
      .getState()
      .dispatchError(`[SubscriptionRegistry] Live sync error for ledger "${ledgerId}": ${err?.message ?? err}`);
  });

  registry.set(ledgerId, { changes, consumers });

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[SubscriptionRegistry] Created new subscription for ledger "${ledgerId}" ` +
        `(total subscriptions: ${registry.size})`
    );
  }

  return () => _removeConsumer(ledgerId, consumerId);
}

/**
 * Remove a consumer from a ledger's subscription.
 * Cancels the PouchDB feed when the last consumer unsubscribes.
 */
function _removeConsumer(ledgerId: string, consumerId: string): void {
  const entry = registry.get(ledgerId);
  if (!entry) return;

  entry.consumers.delete(consumerId);

  if (entry.consumers.size === 0) {
    entry.changes.cancel();
    registry.delete(ledgerId);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[SubscriptionRegistry] Cancelled subscription for ledger "${ledgerId}" ` +
          `(remaining subscriptions: ${registry.size})`
      );
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log(
      `[SubscriptionRegistry] Removed consumer "${consumerId}" from ledger "${ledgerId}" ` +
        `(remaining consumers: ${entry.consumers.size})`
    );
  }
}

/**
 * Cancel ALL active ledger subscriptions.
 * Call on workflow switch or component unmount to prevent memory leaks (AC7).
 */
export function unsubscribeAll(): void {
  registry.forEach((entry) => entry.changes.cancel());
  registry.clear();
  if (process.env.NODE_ENV === 'development') {
    console.log('[SubscriptionRegistry] All subscriptions cancelled');
  }
}

/**
 * Remove all consumers for a specific node across all ledger subscriptions.
 * Call when a node is deleted.
 */
export function unsubscribeNode(nodeId: string): void {
  registry.forEach((entry, ledgerId) => {
    if (entry.consumers.has(nodeId)) {
      _removeConsumer(ledgerId, nodeId);
    }
  });
}

/**
 * Returns the number of active PouchDB subscriptions (one per unique ledger).
 * Useful for development/testing assertions.
 */
export function getActiveSubscriptionCount(): number {
  return registry.size;
}

/**
 * Returns the total number of consumers across all subscriptions.
 */
export function getTotalConsumerCount(): number {
  let total = 0;
  registry.forEach((entry) => { total += entry.consumers.size; });
  return total;
}
