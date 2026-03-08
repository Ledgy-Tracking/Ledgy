import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSyncStore } from './useSyncStore';
import * as dbModule from '../lib/db';

vi.mock('../lib/db', () => ({
    getProfileDb: vi.fn(),
    setup_sync: vi.fn(),
    get_sync_config: vi.fn(),
    save_sync_config: vi.fn()
}));
const mockGetState = vi.fn(() => ({ isUnlocked: true, encryptionKey: {} }));
vi.mock('../features/auth/useAuthStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector: any) => selector({ isUnlocked: true, encryptionKey: {} })),
        { getState: () => mockGetState() }
    )
}));

// A simple waitFor utility for Vitest
async function waitFor(callback: () => void, { timeout = 2000, interval = 50 } = {}) {
    const startTime = Date.now();
    while (true) {
        try {
            callback();
            return;
        } catch (e) {
            if (Date.now() - startTime > timeout) {
                throw e;
            }
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

describe('useSyncStore Conflict Detection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useSyncStore.getState().clearConflicts();
    });

    it('detects conflicts in sync change events', async () => {
        const mockDb = {
            get: vi.fn().mockImplementation((id, options) => {
                if (options?.rev) {
                    return Promise.resolve({ _id: id, title: 'Remote Title', updatedAt: '2023-01-01T12:00:00Z', ledgerName: 'Test' });
                }
                return Promise.resolve({ _id: id, title: 'Local Title', updatedAt: '2023-01-01T12:05:00Z', ledgerName: 'Test' });
            })
        };
        const mockProfileDb = {
            db: mockDb,
            cancelSync: vi.fn(),
            getDocument: vi.fn().mockResolvedValue({ _id: 'doc1', title: 'Local Title', updatedAt: '2023-01-01T12:05:00Z', ledgerName: 'Test' })
        };
        (dbModule.getProfileDb as any).mockReturnValue(mockProfileDb);
        (dbModule.get_sync_config as any).mockResolvedValue({ profileId: 'profile1' });

        let changeCallback: any;
        const mockSync = {
            on: vi.fn().mockImplementation((event, callback) => {
                if (event === 'change') {
                    changeCallback = callback;
                }
                return mockSync;
            })
        };
        (dbModule.setup_sync as any).mockReturnValue(mockSync);

        const store = useSyncStore.getState();
        await store.triggerSync('profile1');

        // Manually trigger the change event
        if (changeCallback) {
            changeCallback({
                docs: [{
                    _id: 'doc1',
                    _conflicts: ['rev-remote-1']
                }]
            });
        }

        // Use waitFor to wait for the async listener to finish processing
        await waitFor(() => {
            const updatedStore = useSyncStore.getState();
            expect(updatedStore.conflicts).toHaveLength(1);
            expect(updatedStore.conflicts[0].entryId).toBe('doc1');

            // Check that title is one of the conflicting fields
            const hasTitleConflict = updatedStore.conflicts[0].conflictingFields.includes('title');
            expect(hasTitleConflict).toBe(true);
        });
    });
});
