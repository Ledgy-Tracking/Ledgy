/**
 * Integration tests for Story 4.10: Graph PouchDB Hydration Hooks
 *
 * Covers:
 * - AC1: Full hydration flow (Ledger Source node loads data on canvas init)
 * - AC2: Live update propagation (PouchDB change → node data update)
 * - AC5: Ghost reference detection and display during hydration
 * - AC6: Schema change propagation to affected nodes
 * - AC7: Subscription deduplication — multiple nodes on same ledger share 1 PouchDB feed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { hydrateLedgerSourceNode } from '../../../../features/nodeEditor/hooks/useLedgerData';
import { hydrateLedgerWithGhosts } from '../../../../features/nodeEditor/utils/ghostReference';
import {
  subscribeToLedger,
  unsubscribeAll,
  getActiveSubscriptionCount,
  getTotalConsumerCount,
} from '../../../../features/nodeEditor/utils/subscriptionRegistry';
import {
  detectSchemaChange,
  handleSchemaChangeForNodes,
  SchemaChangeType,
} from '../../../../features/nodeEditor/utils/schemaChangeHandler';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { useNodeStore } from '@/stores/useNodeStore';
import { useErrorStore } from '@/stores/useErrorStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  getProfileDb: vi.fn(),
}));

vi.mock('@/stores/useProfileStore', () => {
  const getState = vi.fn(() => ({ activeProfileId: 'profile-1' }));
  const useProfileStore: any = vi.fn(() => ({ activeProfileId: 'profile-1' }));
  useProfileStore.getState = getState;
  return { useProfileStore };
});

vi.mock('@/stores/useErrorStore', () => ({
  useErrorStore: {
    getState: vi.fn(() => ({ dispatchError: vi.fn() })),
  },
}));

vi.mock('@/stores/useNodeStore', () => {
  const mockUpdateNodeData = vi.fn();
  const mockGetState = vi.fn(() => ({
    nodes: [],
    schemas: [],
    updateNodeData: mockUpdateNodeData,
    hydrationState: { isHydrating: false, hydratedLedgerIds: [], errors: {} },
    setHydrationState: vi.fn(),
    batchUpdateNodeData: vi.fn(),
  }));
  return {
    useNodeStore: {
      getState: mockGetState,
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROFILE_ID = 'profile-1';
const TEST_LEDGER_ID = 'ledger-integration-1';
const TEST_SCHEMA = [
  { id: 'name', name: 'Name', type: 'text' },
  { id: 'amount', name: 'Amount', type: 'number' },
];

function makeMockDoc(overrides: Record<string, any> = {}) {
  return {
    _id: `entry:${uuidv4()}`,
    type: 'entry',
    ledgerId: TEST_LEDGER_ID,
    data: { name: 'Alice', amount: 100 },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockDbWith(docs: any[]) {
  const db = {
    getAllDocuments: vi.fn().mockResolvedValue(docs),
    changes: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      cancel: vi.fn(),
    }),
  };
  (getProfileDb as any).mockReturnValue(db);
  return db;
}

// ---------------------------------------------------------------------------
// AC1: Full hydration flow
// ---------------------------------------------------------------------------

describe('AC1: Full hydration flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns hydrated entries filtered to schema fields', async () => {
    const docs = [
      makeMockDoc({ data: { name: 'Alice', amount: 42, extra: 'ignored' } }),
      makeMockDoc({ data: { name: 'Bob', amount: 10 } }),
    ];
    mockDbWith(docs);

    const result = await hydrateLedgerSourceNode(TEST_LEDGER_ID, TEST_SCHEMA, false);

    expect(result.entries).toHaveLength(2);
    // Extra field should be filtered out
    expect((result.entries[0].data as any).extra).toBeUndefined();
    expect(result.count).toBe(2);
    expect(result.error).toBeUndefined();
  });

  it('excludes deleted entries from active hydration', async () => {
    const docs = [
      makeMockDoc({ data: { name: 'Active', amount: 1 } }),
      makeMockDoc({ data: { name: 'Deleted', amount: 2 }, isDeleted: true }),
    ];
    mockDbWith(docs);

    const result = await hydrateLedgerSourceNode(TEST_LEDGER_ID, TEST_SCHEMA, false);

    expect(result.entries).toHaveLength(1);
    expect((result.entries[0].data as any).name).toBe('Active');
  });

  it('returns empty entries when ledger has no data', async () => {
    mockDbWith([]);

    const result = await hydrateLedgerSourceNode(TEST_LEDGER_ID, TEST_SCHEMA, false);

    expect(result.entries).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('computes numeric aggregates for number fields', async () => {
    const docs = [
      makeMockDoc({ data: { name: 'A', amount: 10 } }),
      makeMockDoc({ data: { name: 'B', amount: 20 } }),
      makeMockDoc({ data: { name: 'C', amount: 30 } }),
    ];
    mockDbWith(docs);

    const result = await hydrateLedgerSourceNode(TEST_LEDGER_ID, TEST_SCHEMA, false);

    expect(result.aggregates?.sum?.amount).toBe(60);
    expect(result.aggregates?.avg?.amount).toBe(20);
    expect(result.aggregates?.min?.amount).toBe(10);
    expect(result.aggregates?.max?.amount).toBe(30);
  });

  it('handles PouchDB errors gracefully and dispatches to error store', async () => {
    const mockDispatchError = vi.fn();
    (useErrorStore.getState as any).mockReturnValue({ dispatchError: mockDispatchError });

    (getProfileDb as any).mockReturnValue({
      getAllDocuments: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    });

    const result = await hydrateLedgerSourceNode(TEST_LEDGER_ID, TEST_SCHEMA, false);

    expect(result.error).toBe('DB unavailable');
    expect(result.entries).toEqual([]);
    expect(mockDispatchError).toHaveBeenCalledWith('DB unavailable');
  });
});

// ---------------------------------------------------------------------------
// AC5: Ghost reference handling
// ---------------------------------------------------------------------------

describe('AC5: Ghost reference detection during hydration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('separates active entries from ghost entries', async () => {
    const docs = [
      makeMockDoc({ data: { name: 'Active', amount: 5 } }),
      makeMockDoc({ data: { name: 'Ghost', amount: 99 }, isDeleted: true }),
      makeMockDoc({ data: { name: 'AnotherGhost', amount: 1 }, deletedAt: '2024-01-01' }),
    ];
    mockDbWith(docs);

    const result = await hydrateLedgerWithGhosts(TEST_LEDGER_ID, TEST_SCHEMA);

    expect(result.entries).toHaveLength(1);
    expect(result.ghosts).toHaveLength(2);
    expect(result.ghostCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('ghost indicators include display metadata', async () => {
    const docs = [
      makeMockDoc({ data: { name: 'Gone', amount: 7 }, isDeleted: true }),
    ];
    mockDbWith(docs);

    const result = await hydrateLedgerWithGhosts(TEST_LEDGER_ID, TEST_SCHEMA);

    const ghost = result.ghosts[0];
    expect(ghost.displayText).toBe('[Deleted Entry]');
    expect(ghost.tooltip).toBe('This entry has been deleted on another device');
    expect(ghost.style).toBe('strikethrough + gray');
  });

  it('returns zero ghosts when all entries are active', async () => {
    mockDbWith([
      makeMockDoc({ data: { name: 'OK', amount: 1 } }),
    ]);

    const result = await hydrateLedgerWithGhosts(TEST_LEDGER_ID, TEST_SCHEMA);

    expect(result.ghosts).toHaveLength(0);
    expect(result.ghostCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC6: Schema change propagation
// ---------------------------------------------------------------------------

describe('AC6: Schema change propagation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('detects field added and updates node schema snapshot', () => {
    const mockUpdateNodeData = vi.fn();
    (useNodeStore.getState as any).mockReturnValue({
      nodes: [
        { id: 'node-1', type: 'ledgerSource', data: { ledgerId: TEST_LEDGER_ID, schemaSnapshot: TEST_SCHEMA } },
      ],
      updateNodeData: mockUpdateNodeData,
    });

    const newField = { id: 'tags', name: 'Tags', type: 'text' };
    const change = {
      type: SchemaChangeType.FIELD_ADDED,
      ledgerId: TEST_LEDGER_ID,
      oldSchema: TEST_SCHEMA,
      newSchema: [...TEST_SCHEMA, newField],
      changedFields: [newField],
    };

    handleSchemaChangeForNodes(change);

    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
      schemaSnapshot: [...TEST_SCHEMA, newField],
    });
  });

  it('detects field removed and sets stale schema warning', () => {
    const mockUpdateNodeData = vi.fn();
    (useNodeStore.getState as any).mockReturnValue({
      nodes: [
        { id: 'node-1', type: 'ledgerSource', data: { ledgerId: TEST_LEDGER_ID, schemaSnapshot: TEST_SCHEMA } },
      ],
      updateNodeData: mockUpdateNodeData,
    });

    const removedField = TEST_SCHEMA[1]; // amount
    const change = {
      type: SchemaChangeType.FIELD_REMOVED,
      ledgerId: TEST_LEDGER_ID,
      oldSchema: TEST_SCHEMA,
      newSchema: [TEST_SCHEMA[0]],
      changedFields: [removedField],
    };

    handleSchemaChangeForNodes(change);

    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', {
      schemaSnapshot: [TEST_SCHEMA[0]],
      schemaStaleWarning: 'Fields removed: Amount',
    });
  });

  it('only updates nodes whose ledgerId matches the changed schema', () => {
    const mockUpdateNodeData = vi.fn();
    (useNodeStore.getState as any).mockReturnValue({
      nodes: [
        { id: 'node-1', type: 'ledgerSource', data: { ledgerId: TEST_LEDGER_ID, schemaSnapshot: TEST_SCHEMA } },
        { id: 'node-2', type: 'ledgerSource', data: { ledgerId: 'other-ledger', schemaSnapshot: TEST_SCHEMA } },
      ],
      updateNodeData: mockUpdateNodeData,
    });

    const change = {
      type: SchemaChangeType.FIELD_ADDED,
      ledgerId: TEST_LEDGER_ID,
      oldSchema: TEST_SCHEMA,
      newSchema: [...TEST_SCHEMA, { id: 'new', name: 'New', type: 'text' }],
      changedFields: [{ id: 'new', name: 'New', type: 'text' }],
    };

    handleSchemaChangeForNodes(change);

    expect(mockUpdateNodeData).toHaveBeenCalledTimes(1);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', expect.anything());
  });

  it('detectSchemaChange returns null when schemas are identical', () => {
    expect(detectSchemaChange(TEST_SCHEMA, TEST_SCHEMA)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC7: Subscription deduplication
// ---------------------------------------------------------------------------

describe('AC7: Subscription sharing — one PouchDB feed per ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeAll(); // reset module-level registry between tests
  });

  afterEach(() => {
    unsubscribeAll();
  });

  it('creates only ONE PouchDB changes subscription for multiple nodes on same ledger', () => {
    const mockChanges = { on: vi.fn().mockReturnThis(), cancel: vi.fn() };
    const mockDb = { changes: vi.fn().mockReturnValue(mockChanges) };
    (getProfileDb as any).mockReturnValue(mockDb);

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cb3 = vi.fn();

    subscribeToLedger(TEST_LEDGER_ID, 'node-1', cb1);
    subscribeToLedger(TEST_LEDGER_ID, 'node-2', cb2);
    subscribeToLedger(TEST_LEDGER_ID, 'node-3', cb3);

    // Only 1 PouchDB changes call despite 3 consumers
    expect(mockDb.changes).toHaveBeenCalledTimes(1);
    expect(getActiveSubscriptionCount()).toBe(1);
    expect(getTotalConsumerCount()).toBe(3);
  });

  it('broadcasts PouchDB changes to all registered consumers', () => {
    const mockChanges = { on: vi.fn().mockReturnThis(), cancel: vi.fn() };
    (getProfileDb as any).mockReturnValue({ changes: vi.fn().mockReturnValue(mockChanges) });

    const cb1 = vi.fn();
    const cb2 = vi.fn();

    subscribeToLedger(TEST_LEDGER_ID, 'node-1', cb1);
    subscribeToLedger(TEST_LEDGER_ID, 'node-2', cb2);

    // Extract and fire the 'change' handler
    const changeHandler = mockChanges.on.mock.calls.find((c: any[]) => c[0] === 'change')?.[1];
    expect(changeHandler).toBeDefined();

    const fakeChange = { doc: { _id: 'entry:abc', type: 'entry', ledgerId: TEST_LEDGER_ID } };
    changeHandler(fakeChange);

    expect(cb1).toHaveBeenCalledWith(fakeChange);
    expect(cb2).toHaveBeenCalledWith(fakeChange);
  });

  it('cancels PouchDB subscription only when last consumer unsubscribes', () => {
    const mockChanges = { on: vi.fn().mockReturnThis(), cancel: vi.fn() };
    (getProfileDb as any).mockReturnValue({ changes: vi.fn().mockReturnValue(mockChanges) });

    const unsub1 = subscribeToLedger(TEST_LEDGER_ID, 'node-1', vi.fn());
    const unsub2 = subscribeToLedger(TEST_LEDGER_ID, 'node-2', vi.fn());

    unsub1();
    expect(mockChanges.cancel).not.toHaveBeenCalled();
    expect(getActiveSubscriptionCount()).toBe(1); // Still one consumer

    unsub2();
    expect(mockChanges.cancel).toHaveBeenCalledTimes(1); // Now cancelled
    expect(getActiveSubscriptionCount()).toBe(0);
  });

  it('creates separate subscriptions for different ledgers', () => {
    const mockChanges = { on: vi.fn().mockReturnThis(), cancel: vi.fn() };
    const mockDb = { changes: vi.fn().mockReturnValue(mockChanges) };
    (getProfileDb as any).mockReturnValue(mockDb);

    subscribeToLedger('ledger-A', 'node-1', vi.fn());
    subscribeToLedger('ledger-B', 'node-2', vi.fn());

    expect(mockDb.changes).toHaveBeenCalledTimes(2);
    expect(getActiveSubscriptionCount()).toBe(2);
  });

  it('unsubscribeAll cancels all active subscriptions', () => {
    const mockChanges = { on: vi.fn().mockReturnThis(), cancel: vi.fn() };
    (getProfileDb as any).mockReturnValue({ changes: vi.fn().mockReturnValue(mockChanges) });

    subscribeToLedger('ledger-A', 'node-1', vi.fn());
    subscribeToLedger('ledger-B', 'node-2', vi.fn());

    expect(getActiveSubscriptionCount()).toBe(2);

    unsubscribeAll();

    expect(mockChanges.cancel).toHaveBeenCalledTimes(2);
    expect(getActiveSubscriptionCount()).toBe(0);
  });
});
