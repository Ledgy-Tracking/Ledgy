import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { subscribeToLedgerChanges, useLiveQuery } from '../../../features/nodeEditor/hooks/useLiveQuery';
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
  useProfileStore.getState = getState;
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

// Import after mocks
import { useProfileStore } from '@/stores/useProfileStore';

describe('useLiveQuery', () => {
  const mockProfileId = 'test-profile';
  const mockLedgerId = 'test-ledger';

  const mockDb = {
    changes: vi.fn(),
    getAllDocuments: vi.fn()
  };

  const mockChanges = {
    on: vi.fn().mockReturnThis(),
    cancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish store mocks that individual tests may have overridden
    (useProfileStore.getState as any).mockReturnValue({ activeProfileId: mockProfileId });
    mockDb.changes.mockReturnValue(mockChanges);
    mockDb.getAllDocuments.mockResolvedValue([]);
    (getProfileDb as any).mockReturnValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToLedgerChanges', () => {
    it('should subscribe to ledger changes with correct selector', () => {
      const onChange = vi.fn();

      const unsubscribe = subscribeToLedgerChanges(mockLedgerId, onChange);

      expect(getProfileDb).toHaveBeenCalledWith(mockProfileId);
      expect(mockDb.changes).toHaveBeenCalledWith({
        since: 'now',
        live: true,
        include_docs: true,
        selector: {
          type: 'entry',
          ledgerId: mockLedgerId,
          isDeleted: { $exists: false }
        }
      });

      expect(mockChanges.on).toHaveBeenCalledWith('change', onChange);
      expect(mockChanges.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Test unsubscribe
      unsubscribe();
      expect(mockChanges.cancel).toHaveBeenCalled();
    });

    it('should handle errors in changes feed', () => {
      const onChange = vi.fn();
      const mockDispatchError = vi.fn();
      (useErrorStore as any).getState.mockReturnValue({
        dispatchError: mockDispatchError
      });

      subscribeToLedgerChanges(mockLedgerId, onChange);

      // Get the error handler
      const errorHandler = mockChanges.on.mock.calls.find((call: any) => call[0] === 'error')![1];

      const error = new Error('Changes feed error');
      errorHandler(error);

      expect(mockDispatchError).toHaveBeenCalledWith('Live sync error: Changes feed error');
    });

    it('should throw error if no active profile', () => {
      useProfileStore.getState.mockReturnValueOnce({
        activeProfileId: null
      });

      expect(() => subscribeToLedgerChanges(mockLedgerId, vi.fn())).toThrow('No active profile');
    });
  });

  describe('useLiveQuery hook', () => {
    // REFRESH_DEBOUNCE_MS = 500ms; we wait 600ms to ensure it fires
    const DEBOUNCE_WAIT = 600;

    it('should subscribe and load initial data', async () => {
      const onDataChange = vi.fn();
      const mockEntries = [
        { _id: 'entry:1', type: 'entry' as const, ledgerId: mockLedgerId, data: { value: 10 }, createdAt: '2024-01-01T00:00:00Z' }
      ];
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      renderHook(() => useLiveQuery(mockLedgerId, onDataChange));

      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });

      expect(mockDb.changes).toHaveBeenCalled();
      expect(mockDb.getAllDocuments).toHaveBeenCalledWith('entry');
      expect(onDataChange).toHaveBeenCalledWith(mockEntries);
    }, 10000);

    it('should handle change events with debouncing', async () => {
      const onDataChange = vi.fn();
      const mockEntries = [
        { _id: 'entry:1', type: 'entry' as const, ledgerId: mockLedgerId, data: { value: 10 }, createdAt: '2024-01-01T00:00:00Z' }
      ];
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      renderHook(() => useLiveQuery(mockLedgerId, onDataChange));

      // Wait for initial data load then reset
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      onDataChange.mockClear();

      const changeHandler = mockChanges.on.mock.calls.find((call: any) => call[0] === 'change')![1];
      act(() => { changeHandler({ doc: mockEntries[0] }); });

      // Should be debounced — not called yet
      expect(onDataChange).not.toHaveBeenCalled();

      // Wait for debounce to fire
      await act(async () => { await new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT)); });

      expect(onDataChange).toHaveBeenCalledWith(mockEntries);
    }, 10000);

    it('should not subscribe if no ledgerId', async () => {
      const onDataChange = vi.fn();
      renderHook(() => useLiveQuery(undefined, onDataChange));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mockDb.changes).not.toHaveBeenCalled();
    }, 10000);

    it('should not subscribe if no active profile', async () => {
      (useProfileStore.getState as any).mockReturnValue({ activeProfileId: null });
      const onDataChange = vi.fn();
      renderHook(() => useLiveQuery(mockLedgerId, onDataChange));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mockDb.changes).not.toHaveBeenCalled();
    }, 10000);

    it('should handle refresh errors', async () => {
      const onDataChange = vi.fn();
      const mockDispatchError = vi.fn();
      mockDb.getAllDocuments.mockRejectedValue(new Error('DB error'));
      (useErrorStore as any).getState.mockReturnValue({ dispatchError: mockDispatchError });

      renderHook(() => useLiveQuery(mockLedgerId, onDataChange));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });

      const changeHandler = mockChanges.on.mock.calls.find((call: any) => call[0] === 'change')![1];
      act(() => { changeHandler({ doc: {} }); });

      await act(async () => { await new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT)); });

      expect(mockDispatchError).toHaveBeenCalledWith('DB error');
    }, 10000);

    it('should provide manual refresh function', async () => {
      const onDataChange = vi.fn();
      const mockEntries = [
        { _id: 'entry:1', type: 'entry' as const, ledgerId: mockLedgerId, data: { value: 10 } }
      ];
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      const { result } = renderHook(() => useLiveQuery(mockLedgerId, onDataChange));

      await act(async () => { await result.current.refresh(); });

      expect(onDataChange).toHaveBeenCalledWith(mockEntries);
    }, 10000);

    it('should filter and sort entries correctly', async () => {
      const onDataChange = vi.fn();
      const mockEntries = [
        { _id: 'entry:1', type: 'entry' as const, ledgerId: mockLedgerId, data: { value: 10 }, createdAt: '2024-01-01T00:00:00Z' },
        { _id: 'entry:2', type: 'entry' as const, ledgerId: mockLedgerId, data: { value: 20 }, createdAt: '2024-01-02T00:00:00Z', isDeleted: true },
        { _id: 'entry:3', type: 'entry' as const, ledgerId: 'other-ledger', data: { value: 30 }, createdAt: '2024-01-03T00:00:00Z' }
      ];
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      renderHook(() => useLiveQuery(mockLedgerId, onDataChange));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      onDataChange.mockClear();

      const changeHandler = mockChanges.on.mock.calls.find((call: any) => call[0] === 'change')![1];
      act(() => { changeHandler({ doc: mockEntries[0] }); });

      await act(async () => { await new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT)); });

      const calledWith = onDataChange.mock.calls[0][0];
      expect(calledWith).toHaveLength(1);
      expect(calledWith[0]._id).toBe('entry:1');
    }, 10000);

    it('should limit results to cacheSize', async () => {
      const onDataChange = vi.fn();
      const mockEntries = Array.from({ length: 15 }, (_, i) => ({
        _id: `entry:${i}`,
        type: 'entry' as const,
        ledgerId: mockLedgerId,
        data: { value: i },
        createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`
      }));
      mockDb.getAllDocuments.mockResolvedValue(mockEntries);

      renderHook(() => useLiveQuery(mockLedgerId, onDataChange, 5));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      onDataChange.mockClear();

      const changeHandler = mockChanges.on.mock.calls.find((call: any) => call[0] === 'change')![1];
      act(() => { changeHandler({ doc: mockEntries[0] }); });

      await act(async () => { await new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT)); });

      const calledWith = onDataChange.mock.calls[0][0];
      expect(calledWith).toHaveLength(5);
      expect(calledWith[0]._id).toBe('entry:14');
      expect(calledWith[4]._id).toBe('entry:10');
    }, 10000);
  });
});