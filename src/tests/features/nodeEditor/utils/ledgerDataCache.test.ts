import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LedgerDataCache, ledgerDataCache } from '../../../../features/nodeEditor/utils/ledgerDataCache';

// Mock Date.now for consistent testing
const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
vi.mock('date', () => ({
  now: () => mockNow
}));

describe('LedgerDataCache', () => {
  let cache: LedgerDataCache;

  beforeEach(() => {
    cache = new LedgerDataCache(1, 10); // 1MB, 10 entries
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
    cache.clear();
  });

  describe('basic functionality', () => {
    it('should store and retrieve data', () => {
      const ledgerId = 'ledger1';
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const data = { entries: [{ id: '1', data: { field1: 'value' } }], count: 1 };

      cache.set(ledgerId, schema, data);
      const retrieved = cache.get(ledgerId, schema);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent data', () => {
      const retrieved = cache.get('nonexistent', []);
      expect(retrieved).toBeNull();
    });

    it('should handle different schema snapshots as different cache entries', () => {
      const ledgerId = 'ledger1';
      const schema1 = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const schema2 = [{ id: 'field2', name: 'Field 2', type: 'number' }];
      const data1 = { entries: [{ id: '1', data: { field1: 'value' } }], count: 1 };
      const data2 = { entries: [{ id: '2', data: { field2: 42 } }], count: 1 };

      cache.set(ledgerId, schema1, data1);
      cache.set(ledgerId, schema2, data2);

      expect(cache.get(ledgerId, schema1)).toEqual(data1);
      expect(cache.get(ledgerId, schema2)).toEqual(data2);
    });
  });

  describe('expiration', () => {
    it('should return null for expired data', () => {
      const ledgerId = 'ledger1';
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const data = { entries: [{ id: '1', data: { field1: 'value' } }], count: 1 };

      cache.set(ledgerId, schema, data);

      // Advance time by more than maxAge (default 5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const retrieved = cache.get(ledgerId, schema);
      expect(retrieved).toBeNull();
    });

    it('should respect custom maxAge', () => {
      const ledgerId = 'ledger1';
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const data = { entries: [{ id: '1', data: { field1: 'value' } }], count: 1 };

      cache.set(ledgerId, schema, data);

      // Advance time by 2 minutes (less than custom maxAge of 5 minutes)
      vi.advanceTimersByTime(2 * 60 * 1000);

      const retrieved = cache.get(ledgerId, schema, 5 * 60 * 1000); // 5 minutes
      expect(retrieved).toEqual(data);
    });
  });

  describe('eviction', () => {
    it('should evict least recently used entries when max entries exceeded', () => {
      const maxEntries = 3;
      cache = new LedgerDataCache(100, maxEntries);

      // Add entries beyond the limit
      for (let i = 0; i < maxEntries + 2; i++) {
        const ledgerId = `ledger${i}`;
        const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
        const data = { entries: [{ id: i.toString(), data: { field1: `value${i}` } }], count: 1 };
        cache.set(ledgerId, schema, data);
      }

      // Check that only the most recent entries remain
      expect(cache.get('ledger0', [{ id: 'field1', name: 'Field 1', type: 'text' }])).toBeNull();
      expect(cache.get('ledger1', [{ id: 'field1', name: 'Field 1', type: 'text' }])).toBeNull();
      expect(cache.get('ledger2', [{ id: 'field1', name: 'Field 1', type: 'text' }])).not.toBeNull();
      expect(cache.get('ledger3', [{ id: 'field1', name: 'Field 1', type: 'text' }])).not.toBeNull();
      expect(cache.get('ledger4', [{ id: 'field1', name: 'Field 1', type: 'text' }])).not.toBeNull();
    });

    it('should evict by size when memory limit exceeded', () => {
      cache = new LedgerDataCache(0.001, 100); // Very small limit: 1KB

      const ledgerId = 'ledger1';
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const largeData = {
        entries: Array.from({ length: 100 }, (_, i) => ({
          id: i.toString(),
          data: { field1: 'x'.repeat(100) } // Large string
        })),
        count: 100
      };

      cache.set(ledgerId, schema, largeData);

      // Should evict the large entry immediately on next set
      const smallData = { entries: [{ id: '1', data: { field1: 'small' } }], count: 1 };
      cache.set('ledger2', schema, smallData);

      expect(cache.get(ledgerId, schema)).toBeNull();
      expect(cache.get('ledger2', schema)).toEqual(smallData);
    });
  });

  describe('invalidation', () => {
    it('should invalidate all entries for a specific ledger', () => {
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];

      cache.set('ledger1', schema, { entries: [{ id: '1', data: { field1: 'value1' } }], count: 1 });
      cache.set('ledger2', schema, { entries: [{ id: '2', data: { field1: 'value2' } }], count: 1 });
      cache.set('ledger1', [{ id: 'field2', name: 'Field 2', type: 'text' }],
        { entries: [{ id: '3', data: { field2: 'value3' } }], count: 1 });

      cache.invalidateLedger('ledger1');

      expect(cache.get('ledger1', schema)).toBeNull();
      expect(cache.get('ledger1', [{ id: 'field2', name: 'Field 2', type: 'text' }])).toBeNull();
      expect(cache.get('ledger2', schema)).not.toBeNull();
    });

    it('should invalidate by schema version', () => {
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];

      // Store version 1 for ledger1 and ledger2
      cache.set('ledger1', schema, { entries: [], count: 0 }, 1);
      cache.set('ledger2', schema, { entries: [], count: 0 }, 1);

      // Invalidate ledger1 entries with schemaVersion < 2 (i.e., version 1)
      cache.invalidateBySchemaVersion('ledger1', 2);

      expect(cache.get('ledger1', schema)).toBeNull(); // Version 1 was invalidated
      expect(cache.get('ledger2', schema)).not.toBeNull(); // Different ledger, untouched
    });

    it('should clear all cache entries', () => {
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];

      cache.set('ledger1', schema, { entries: [{ id: '1', data: { field1: 'value1' } }], count: 1 });
      cache.set('ledger2', schema, { entries: [{ id: '2', data: { field1: 'value2' } }], count: 1 });

      cache.clear();

      expect(cache.get('ledger1', schema)).toBeNull();
      expect(cache.get('ledger2', schema)).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should return correct cache statistics', () => {
      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];
      const data = { entries: [{ id: '1', data: { field1: 'test' } }], count: 1 };

      cache.set('ledger1', schema, data);

      const stats = cache.getStats();

      expect(stats.entries).toBe(1);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.sizeMB).toBe(stats.sizeBytes / (1024 * 1024));
      expect(stats.maxSizeMB).toBe(1);
    });
  });

  describe('LRU behavior', () => {
    it('should move accessed entries to most recently used', () => {
      cache = new LedgerDataCache(100, 2); // Only 2 entries max

      const schema = [{ id: 'field1', name: 'Field 1', type: 'text' }];

      cache.set('ledger1', schema, { entries: [], count: 0 });
      cache.set('ledger2', schema, { entries: [], count: 0 });
      cache.set('ledger3', schema, { entries: [], count: 0 }); // Should evict ledger1

      // Access ledger2 to make it most recently used
      cache.get('ledger2', schema);

      // Add another entry, should evict ledger3 (least recently used)
      cache.set('ledger4', schema, { entries: [], count: 0 });

      expect(cache.get('ledger1', schema)).toBeNull();
      expect(cache.get('ledger2', schema)).not.toBeNull();
      expect(cache.get('ledger3', schema)).toBeNull();
      expect(cache.get('ledger4', schema)).not.toBeNull();
    });
  });

  describe('global cache instance', () => {
    it('should be available as a singleton', () => {
      expect(ledgerDataCache).toBeInstanceOf(LedgerDataCache);
      expect(typeof ledgerDataCache.get).toBe('function');
      expect(typeof ledgerDataCache.set).toBe('function');
    });
  });
});