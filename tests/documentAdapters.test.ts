import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import PouchDB from 'pouchdb';
import {
    getProfileDb,
    _clearProfileDatabases,
    create_schema,
    get_schema,
    create_entry,
    get_entry,
    list_entries,
    delete_entry,
    restore_entry,
} from '../src/lib/db';

const TEST_PROFILE_ID = 'doc-adapter-test';
const TEST_PROFILE_DB_NAME = `ledgy_profile_${TEST_PROFILE_ID}`;

async function freshDb() {
    // Destroy and recreate for test isolation
    const raw = new PouchDB(TEST_PROFILE_DB_NAME);
    await raw.destroy();
    _clearProfileDatabases();
    return getProfileDb(TEST_PROFILE_ID);
}

afterAll(async () => {
    try {
        const raw = new PouchDB(TEST_PROFILE_DB_NAME);
        await raw.destroy();
    } catch {
        // ignore
    }
    _clearProfileDatabases();
});

// AC 1: ID format validation
describe('AC1 - ID Scheme Enforcement', () => {
    it('creates entry doc with _id matching /^entry:[0-9a-f-]{36}$/', async () => {
        const db = await freshDb();
        const entryId = await create_entry(db, 'schema:test', 'schema:test', { name: 'Test' }, TEST_PROFILE_ID);
        expect(entryId).toMatch(/^entry:[0-9a-f-]{36}$/);
    });

    it('creates schema doc with _id matching /^schema:[0-9a-f-]{36}$/', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Test Schema', [], TEST_PROFILE_ID, 'project:test');
        expect(schemaId).toMatch(/^schema:[0-9a-f-]{36}$/);
    });
});

// AC 2: Envelope fields present on create
describe('AC2 - Envelope Field Completeness', () => {
    it('created document contains schema_version, createdAt, updatedAt, type, _id fields', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Envelope Schema', [], TEST_PROFILE_ID, 'project:test');
        const schema = await get_schema(db, schemaId);

        expect(schema._id).toBe(schemaId);
        expect(schema.type).toBe('schema');
        expect(typeof schema.schema_version).toBe('number');
        expect(schema.schema_version).toBeGreaterThanOrEqual(1);
        expect(typeof schema.createdAt).toBe('string');
        expect(typeof schema.updatedAt).toBe('string');
        expect(new Date(schema.createdAt).getTime()).not.toBeNaN();
        expect(new Date(schema.updatedAt).getTime()).not.toBeNaN();
    });

    it('created entry contains all required envelope fields', async () => {
        const db = await freshDb();
        const entryId = await create_entry(db, 'schema:e', 'schema:e', { value: 42 }, TEST_PROFILE_ID);
        const entry = await get_entry(db, entryId);

        expect(entry._id).toBe(entryId);
        expect(entry.type).toBe('entry');
        expect(typeof entry.schema_version).toBe('number');
        expect(entry.schema_version).toBeGreaterThanOrEqual(1);
        expect(typeof entry.createdAt).toBe('string');
        expect(typeof entry.updatedAt).toBe('string');
    });
});

// AC 3: Reserved field rejection
describe('AC3 - Reserved Field Rejection', () => {
    it('createDocument with _secret field throws "reserved for PouchDB internal use"', async () => {
        const db = await freshDb();
        await expect(
            db.createDocument('entry', { _secret: 'x' } as any)
        ).rejects.toThrow('reserved for PouchDB internal use');
    });

    it('createDocument with _custom field throws reserved error', async () => {
        const db = await freshDb();
        await expect(
            db.createDocument('entry', { _custom: 'value' } as any)
        ).rejects.toThrow('reserved for PouchDB internal use');
    });

    it('updateDocument with reserved field throws reserved error', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Reserved Test', [], TEST_PROFILE_ID, 'proj:1');
        await expect(
            db.updateDocument(schemaId, { _hidden: 'bad' } as any)
        ).rejects.toThrow('reserved for PouchDB internal use');
    });
});

// AC 4: get_entry success and 404
describe('AC4 - get_entry adapter', () => {
    it('returns the full LedgerEntry when found', async () => {
        const db = await freshDb();
        const entryId = await create_entry(db, 'schema:x', 'schema:x', { color: 'blue' }, TEST_PROFILE_ID);
        const entry = await get_entry(db, entryId);

        expect(entry._id).toBe(entryId);
        expect(entry.type).toBe('entry');
        expect(entry.data).toEqual({ color: 'blue' });
    });

    it('throws descriptive error (not raw 404) when entry does not exist', async () => {
        const db = await freshDb();
        await expect(get_entry(db, 'entry:does-not-exist')).rejects.toThrow(
            'Entry not found: entry:does-not-exist'
        );
    });
});

// AC 5: Entry/schema CRUD (with real PouchDB via in-memory pattern)
describe('AC5 - Entry and Schema CRUD', () => {
    it('create_schema followed by get_schema returns schema with correct envelope fields', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(
            db,
            'My Schema',
            [{ name: 'Title', type: 'text' }],
            TEST_PROFILE_ID,
            'project:abc'
        );
        const schema = await get_schema(db, schemaId);

        expect(schema.name).toBe('My Schema');
        expect(schema.fields).toHaveLength(1);
        expect(schema.profileId).toBe(TEST_PROFILE_ID);
        expect(schema.schema_version).toBe(1);
        expect(schema.createdAt).toBeTruthy();
        expect(schema.updatedAt).toBeTruthy();
    });
});

// AC from Task 5.7-5.8: delete_entry soft-deletes, list_entries excludes, restore_entry re-includes
describe('Soft-delete and restore', () => {
    it('delete_entry soft-deletes and list_entries excludes soft-deleted entries by default', async () => {
        const db = await freshDb();
        const schemaId = 'schema:soft-test';
        await create_entry(db, schemaId, schemaId, { val: 1 }, TEST_PROFILE_ID);
        const entryId = await create_entry(db, schemaId, schemaId, { val: 2 }, TEST_PROFILE_ID);

        await delete_entry(db, entryId);

        const entries = await list_entries(db, schemaId);
        expect(entries.every(e => e._id !== entryId)).toBe(true);
        expect(entries.some(e => (e.data as any).val === 1)).toBe(true);
    });

    it('restore_entry re-includes entry in list_entries', async () => {
        const db = await freshDb();
        const schemaId = 'schema:restore-test';
        const entryId = await create_entry(db, schemaId, schemaId, { restored: true }, TEST_PROFILE_ID);

        await delete_entry(db, entryId);
        const afterDelete = await list_entries(db, schemaId);
        expect(afterDelete.find(e => e._id === entryId)).toBeUndefined();

        await restore_entry(db, entryId);
        const afterRestore = await list_entries(db, schemaId);
        expect(afterRestore.find(e => e._id === entryId)).toBeDefined();
    });
});
