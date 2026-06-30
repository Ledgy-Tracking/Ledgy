// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGhostEntry,
  checkGhostReferences,
  hydrateLedgerWithGhosts,
  getGhostDisplayInfo
} from '../../../../features/nodeEditor/utils/ghostReference';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getProfileDb: vi.fn()
}));

vi.mock('@/stores/useProfileStore', () => ({
  useProfileStore: {
    getState: vi.fn(() => ({ activeProfileId: 'test-profile' }))
  }
}));

describe('ghostReference utilities', () => {
  const mockProfileId = 'test-profile';
  const mockLedgerId = 'test-ledger';

  const mockDb = {
    getAllDocuments: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getProfileDb as any).mockReturnValue(mockDb);
    // Re-establish getState mock after vi.clearAllMocks() in case a previous test overrode it
    (useProfileStore.getState as any).mockReturnValue({ activeProfileId: mockProfileId });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isGhostEntry', () => {
    it('should return true for null document', () => {
      expect(isGhostEntry(null)).toBe(true);
    });

    it('should return true for undefined document', () => {
      expect(isGhostEntry(undefined)).toBe(true);
    });

    it('should return true for explicitly deleted entry', () => {
      const doc = { _id: 'entry:1', type: 'entry', isDeleted: true };
      expect(isGhostEntry(doc)).toBe(true);
    });

    it('should return true for entry with deletedAt timestamp', () => {
      const doc = { _id: 'entry:1', type: 'entry', deletedAt: '2024-01-01T00:00:00Z' };
      expect(isGhostEntry(doc)).toBe(true);
    });

    it('should return false for active entry', () => {
      const doc = { _id: 'entry:1', type: 'entry', data: { value: 42 } };
      expect(isGhostEntry(doc)).toBe(false);
    });

    it('should return false for non-entry document', () => {
      const doc = { _id: 'schema:test', type: 'schema' };
      expect(isGhostEntry(doc)).toBe(false);
    });
  });

  describe('checkGhostReferences', () => {
    it('should return empty set for empty input', async () => {
      const result = await checkGhostReferences([]);
      expect(result).toEqual(new Set());
    });

    it('should identify explicitly deleted entries as ghosts', async () => {
      const mockDocs = [
        { _id: 'entry:1', type: 'entry', ledgerId: mockLedgerId, isDeleted: true },
        { _id: 'entry:2', type: 'entry', ledgerId: mockLedgerId, data: { value: 42 } },
        { _id: 'entry:3', type: 'entry', ledgerId: mockLedgerId, deletedAt: '2024-01-01T00:00:00Z' }
      ];

      mockDb.getAllDocuments.mockResolvedValue(mockDocs);

      const result = await checkGhostReferences(['entry:1', 'entry:2', 'entry:3']);
      expect(result).toEqual(new Set(['entry:1', 'entry:3']));
    });

    it('should identify missing entries as ghosts', async () => {
      const mockDocs = [
        { _id: 'entry:1', type: 'entry', ledgerId: mockLedgerId, data: { value: 42 } }
      ];

      mockDb.getAllDocuments.mockResolvedValue(mockDocs);

      const result = await checkGhostReferences(['entry:1', 'entry:2', 'entry:3']);
      expect(result).toEqual(new Set(['entry:2', 'entry:3']));
    });

    it('should combine explicitly deleted and missing entries', async () => {
      const mockDocs = [
        { _id: 'entry:1', type: 'entry', ledgerId: mockLedgerId, isDeleted: true },
        { _id: 'entry:2', type: 'entry', ledgerId: mockLedgerId, data: { value: 42 } }
      ];

      mockDb.getAllDocuments.mockResolvedValue(mockDocs);

      const result = await checkGhostReferences(['entry:1', 'entry:2', 'entry:3', 'entry:4']);
      expect(result).toEqual(new Set(['entry:1', 'entry:3', 'entry:4']));
    });

    it('should throw error if no active profile', async () => {
      useProfileStore.getState.mockReturnValue({ activeProfileId: null });

      await expect(checkGhostReferences(['entry:1'])).rejects.toThrow('No active profile');
    });
  });

  describe('hydrateLedgerWithGhosts', () => {
    const schema = [
      { id: 'field1', name: 'Field 1', type: 'text' },
      { id: 'field2', name: 'Field 2', type: 'number' }
    ];

    it('should separate active entries from ghosts', async () => {
      const mockDocs = [
        {
          _id: 'entry:1',
          type: 'entry',
          ledgerId: mockLedgerId,
          data: { field1: 'value1', field2: 10, extra: 'ignored' },
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          _id: 'entry:2',
          type: 'entry',
          ledgerId: mockLedgerId,
          data: { field1: 'value2', field2: 20 },
          isDeleted: true,
          createdAt: '2024-01-02T00:00:00Z'
        },
        {
          _id: 'entry:3',
          type: 'entry',
          ledgerId: mockLedgerId,
          data: { field1: 'value3', field2: 30 },
          deletedAt: '2024-01-03T00:00:00Z',
          createdAt: '2024-01-03T00:00:00Z'
        },
        {
          _id: 'entry:4',
          type: 'entry',
          ledgerId: 'other-ledger', // Different ledger
          data: { field1: 'value4', field2: 40 }
        }
      ];

      mockDb.getAllDocuments.mockResolvedValue(mockDocs);

      const result = await hydrateLedgerWithGhosts(mockLedgerId, schema);

      // Should have 1 active entry
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]._id).toBe('entry:1');
      expect(result.entries[0].data).toEqual({ field1: 'value1', field2: 10 }); // Extra fields filtered

      // Should have 2 ghosts
      expect(result.ghosts).toHaveLength(2);
      expect(result.ghostCount).toBe(2);
      expect(result.totalCount).toBe(3);

      // Check ghost indicators
      expect(result.ghosts[0]).toMatchObject({
        entryId: 'entry:3',
        displayText: '[Deleted Entry]',
        tooltip: 'This entry has been deleted on another device',
        style: 'strikethrough + gray'
      });
    });

    it('should sort entries by createdAt descending', async () => {
      const mockDocs = [
        {
          _id: 'entry:1',
          type: 'entry',
          ledgerId: mockLedgerId,
          data: { field1: 'older' },
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          _id: 'entry:2',
          type: 'entry',
          ledgerId: mockLedgerId,
          data: { field1: 'newer' },
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockDb.getAllDocuments.mockResolvedValue(mockDocs);

      const result = await hydrateLedgerWithGhosts(mockLedgerId, schema);

      expect(result.entries[0]._id).toBe('entry:2'); // Newer first
      expect(result.entries[1]._id).toBe('entry:1'); // Older second
    });

    it('should handle empty results', async () => {
      mockDb.getAllDocuments.mockResolvedValue([]);

      const result = await hydrateLedgerWithGhosts(mockLedgerId, schema);

      expect(result.entries).toEqual([]);
      expect(result.ghosts).toEqual([]);
      expect(result.ghostCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should throw error if no active profile', async () => {
      useProfileStore.getState.mockReturnValue({ activeProfileId: null });

      await expect(hydrateLedgerWithGhosts(mockLedgerId, schema)).rejects.toThrow('No active profile');
    });
  });

  describe('getGhostDisplayInfo', () => {
    it('should return null for active entry', () => {
      const doc = { _id: 'entry:1', type: 'entry', data: { value: 42 } };
      const result = getGhostDisplayInfo(doc);
      expect(result).toBeNull();
    });

    it('should return ghost info for deleted entry', () => {
      const doc = { _id: 'entry:1', type: 'entry', isDeleted: true };
      const result = getGhostDisplayInfo(doc);
      expect(result).toEqual({
        entryId: 'entry:1',
        displayText: '[Deleted Entry]',
        tooltip: 'This entry has been deleted on another device',
        style: 'strikethrough + gray',
        icon: '⚠️'
      });
    });

    it('should return ghost info for entry with deletedAt', () => {
      const doc = { _id: 'entry:1', type: 'entry', deletedAt: '2024-01-01T00:00:00Z' };
      const result = getGhostDisplayInfo(doc);
      expect(result).toEqual({
        entryId: 'entry:1',
        displayText: '[Deleted Entry]',
        tooltip: 'This entry has been deleted on another device',
        style: 'strikethrough + gray',
        icon: '⚠️'
      });
    });

    it('should handle entry without _id', () => {
      const doc = { entryId: 'entry:1', isDeleted: true };
      const result = getGhostDisplayInfo(doc);
      expect(result?.entryId).toBe('entry:1');
    });
  });
});
