import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hydrateLedgerSourceNode, useLedgerData } from '../../../features/nodeEditor/hooks/useLedgerData';
import { ledgerDataCache } from '../../../features/nodeEditor/utils/ledgerDataCache';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { useErrorStore } from '@/stores/useErrorStore';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getProfileDb: vi.fn()
}));

vi.mock('@/stores/useProfileStore', () => {
  const getState = vi.fn(() => ({ activeProfileId: 'test-profile' }));
  const useProfileStore = vi.fn(() => ({ activeProfileId: 'test-profile' }));
  (useProfileStore as any).getState = getState;
  return {
    useProfileStore
  };
});

vi.mock('@/stores/useErrorStore', () => ({
  useErrorStore: {
    getState: vi.fn(() => ({
      dispatchError: vi.fn()
    }))
  }
}));

describe('useLedgerData', () => {
  const mockProfileId = 'test-profile';
  const mockLedgerId = 'test-ledger';
  const mockSchemaSnapshot = [
    { id: 'field1', name: 'Field 1', type: 'text' as const },
    { id: 'field2', name: 'Field 2', type: 'number' as const },
    { id: 'field3', name: 'Field 3', type: 'number' as const }
  ];

  const mockEntries = [
    {
      _id: 'entry:1',
      type: 'entry' as const,
      ledgerId: mockLedgerId,
      schemaId: 'schema1',
      data: { field1: 'value1', field2: 10, field3: 20, field4: 'extra' },
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: 'entry:2',
      type: 'entry' as const,
      ledgerId: mockLedgerId,
      schemaId: 'schema1',
      data: { field1: 'value2', field2: 15, field3: 25 },
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      _id: 'entry:3',
      type: 'entry' as const,
      ledgerId: 'other-ledger',
      schemaId: 'schema1',
      data: { field1: 'value3', field2: 30 },
      createdAt: '2024-01-03T00:00:00Z'
    },
    {
      _id: 'entry:4',
      type: 'entry' as const,
      ledgerId: mockLedgerId,
      schemaId: 'schema1',
      isDeleted: true,
      data: { field1: 'deleted', field2: 40 },
      createdAt: '2024-01-04T00:00:00Z'
    }
  ];

  const mockDb = {
    getAllDocuments: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache so tests don't get stale results from prior test runs
    ledgerDataCache.clear();
    // Re-establish mocks that may have been overridden by individual tests
    (useProfileStore.getState as any).mockReturnValue({ activeProfileId: mockProfileId });
    mockDb.getAllDocuments.mockResolvedValue([]); // default: empty
    (getProfileDb as any).mockReturnValue(mockDb);
    (useErrorStore as any).getState.mockReturnValue({
      dispatchError: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    ledgerDataCache.clear();
  });

  describe('hydrateLedgerSourceNode', () => {
    it('should hydrate ledger data correctly', async () => {
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(getProfileDb).toHaveBeenCalledWith(mockProfileId);
      expect(mockDb.getAllDocuments).toHaveBeenCalledWith('entry');

      // Should filter to correct ledger and exclude deleted
      expect(result.entries).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.lastUpdated).toBeDefined();

      // Should filter data fields to schema snapshot
      expect(result.entries[0].data).toEqual({ field1: 'value2', field2: 15, field3: 25 });
      expect(result.entries[1].data).toEqual({ field1: 'value1', field2: 10, field3: 20 });

      // Should sort by createdAt descending
      expect(result.entries[0]._id).toBe('entry:2');
      expect(result.entries[1]._id).toBe('entry:1');
    });

    it('should calculate aggregates for number fields', async () => {
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(result.aggregates).toBeDefined();
      expect(result.aggregates?.sum?.field2).toBe(25); // 10 + 15
      expect(result.aggregates?.avg?.field2).toBe(12.5); // 25 / 2
      expect(result.aggregates?.min?.field2).toBe(10);
      expect(result.aggregates?.max?.field2).toBe(15);

      expect(result.aggregates?.sum?.field3).toBe(45); // 20 + 25
      expect(result.aggregates?.avg?.field3).toBe(22.5); // 45 / 2
    });

    it('should handle empty results', async () => {
      mockDb.getAllDocuments.mockResolvedValue([]);

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(result.entries).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.aggregates).toBeUndefined();
    });

    it('should handle no active profile', async () => {
      (useProfileStore as any).getState.mockReturnValueOnce({
        activeProfileId: null
      });

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(result.entries).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.error).toBe('No active profile');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.getAllDocuments.mockRejectedValue(error);

      const mockDispatchError = vi.fn();
      (useErrorStore as any).getState.mockReturnValue({
        dispatchError: mockDispatchError
      });

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(mockDispatchError).toHaveBeenCalledWith('Database error');
      expect(result.entries).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Database error');
    });

    it('should handle non-Error exceptions', async () => {
      mockDb.getAllDocuments.mockRejectedValue('String error');

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(result.error).toBe('Failed to hydrate ledger data');
    });

    it('should filter out entries with missing schema fields gracefully', async () => {
      const entriesWithMissingFields = [
        {
          _id: 'entry:1',
          type: 'entry' as const,
          ledgerId: mockLedgerId,
          schemaId: 'schema1',
          data: { field1: 'value1' }, // missing field2, field3
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockDb.getAllDocuments.mockResolvedValue(entriesWithMissingFields);

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      expect(result.entries[0].data).toEqual({ field1: 'value1' });
      // field2 and field3 should not be present
      expect('field2' in result.entries[0].data).toBe(false);
      expect('field3' in result.entries[0].data).toBe(false);
    });

    it('should handle invalid number values in aggregates', async () => {
      const entriesWithInvalidNumbers = [
        {
          _id: 'entry:1',
          type: 'entry' as const,
          ledgerId: mockLedgerId,
          schemaId: 'schema1',
          data: { field1: 'text', field2: 'not-a-number', field3: 10 },
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          _id: 'entry:2',
          type: 'entry' as const,
          ledgerId: mockLedgerId,
          schemaId: 'schema1',
          data: { field1: 'text2', field2: 20, field3: NaN },
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockDb.getAllDocuments.mockResolvedValue(entriesWithInvalidNumbers);

      const result = await hydrateLedgerSourceNode(mockLedgerId, mockSchemaSnapshot);

      // Only field2: 20 should be included (field3 NaN and field2 'not-a-number' excluded)
      expect(result.aggregates?.sum?.field2).toBe(20);
      expect(result.aggregates?.avg?.field2).toBe(20);
      expect(result.aggregates?.min?.field2).toBe(20);
      expect(result.aggregates?.max?.field2).toBe(20);

      // field3 should have aggregates since there's one valid value (10)
      expect(result.aggregates?.sum?.field3).toBe(10);
    });
  });

  describe('useLedgerData hook', () => {
    it('should return hook utilities', () => {
      const { hydrateLedgerSourceNode: hookHydrate } = useLedgerData();

      expect(hookHydrate).toBe(hydrateLedgerSourceNode);
    });
  });
});