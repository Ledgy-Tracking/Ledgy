import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLedgerStore } from '../../stores/useLedgerStore';
import * as dbModule from '../../lib/db';

vi.mock('../../lib/db', () => ({
    getProfileDb: vi.fn(),
    list_schemas: vi.fn(),
    create_schema: vi.fn(),
    update_schema: vi.fn(),
    list_entries: vi.fn(),
    list_all_entries: vi.fn(),
    create_entry: vi.fn(),
    update_entry: vi.fn(),
    delete_entry: vi.fn(),
    restore_entry: vi.fn(),
    find_entries_with_relation_to: vi.fn(),
    decryptLedgerEntry: vi.fn()
}));

const mockGetState = vi.fn(() => ({ isUnlocked: true, encryptionKey: {} }));
vi.mock('../auth/useAuthStore', () => ({
    useAuthStore: Object.assign(
        vi.fn(),
        { getState: () => mockGetState() }
    )
}));

vi.mock('../../stores/useProfileStore', () => ({
    useProfileStore: {
        getState: vi.fn(() => ({ activeProfileId: 'profile1' }))
    }
}));

describe('useLedgerStore (PouchDB Implementation)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useLedgerStore.getState().clearProfileData();
    });

    it('initializes with correct default state', () => {
        const state = useLedgerStore.getState();
        expect(state.entries).toEqual({});
        expect(state.allEntries).toEqual({});
        expect(state.backLinks).toEqual({});
        expect(state.schemas).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('fetchSchemas retrieves schemas from DB', async () => {
        const mockSchemas = [{ _id: 'schema1', name: 'Test Schema', fields: [] }];
        (dbModule.list_schemas as any).mockResolvedValue(mockSchemas);

        await useLedgerStore.getState().fetchSchemas('profile1');

        const state = useLedgerStore.getState();
        expect(state.schemas).toEqual(mockSchemas);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('createSchema creates schema and refreshes list', async () => {
        (dbModule.create_schema as any).mockResolvedValue('new-schema-id');
        const mockSchemas = [{ _id: 'new-schema-id', name: 'New Schema', fields: [] }];
        (dbModule.list_schemas as any).mockResolvedValue(mockSchemas);

        const schemaId = await useLedgerStore.getState().createSchema('profile1', 'proj1', 'New Schema', []);

        expect(schemaId).toBe('new-schema-id');
        const state = useLedgerStore.getState();
        expect(state.schemas).toEqual(mockSchemas);
    });

    it('clearProfileData resets the store to initial state', async () => {
        // First set some state
        const mockSchemas = [{ _id: 'schema1', name: 'Test Schema', fields: [] } as any];
        (dbModule.list_schemas as any).mockResolvedValue(mockSchemas);
        await useLedgerStore.getState().fetchSchemas('profile1');

        expect(useLedgerStore.getState().schemas.length).toBe(1);

        // Then clear it
        useLedgerStore.getState().clearProfileData();

        const state = useLedgerStore.getState();
        expect(state.schemas).toEqual([]);
        expect(state.entries).toEqual({});
        expect(state.error).toBeNull();
    });
});
