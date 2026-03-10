import { describe, it, expect, afterAll } from 'vitest';
import PouchDB from 'pouchdb';
import {
    getProfileDb,
    _clearProfileDatabases,
    create_schema,
    update_schema,
    create_entry,
    get_entry,
    list_entries,
    list_all_entries,
    delete_entry,
} from '../src/lib/db';
import { migrateEntryData } from '../src/lib/migration';
import type { LedgerSchema, LedgerEntry } from '../src/types/ledger';

const TEST_PROFILE_ID = 'migration-test';
const TEST_PROFILE_DB_NAME = `ledgy_profile_${TEST_PROFILE_ID}`;

async function freshDb() {
    const raw = new PouchDB(TEST_PROFILE_DB_NAME);
    await raw.destroy();
    _clearProfileDatabases();
    return getProfileDb(TEST_PROFILE_ID);
}

afterAll(async () => {
    try { await new PouchDB(TEST_PROFILE_DB_NAME).destroy(); } catch { /* ignore */ }
    _clearProfileDatabases();
});

// ─── Inline fixtures ────────────────────────────────────────────────────────

function makeSchema(fields: string[], version = 2): LedgerSchema {
    return {
        _id: 'schema:test-id',
        type: 'schema',
        schema_version: version,
        name: 'Test',
        fields: fields.map(name => ({ name, type: 'text' as const })),
        profileId: 'p1',
        projectId: 'proj1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function makeEntry(data: Record<string, unknown>, version = 1): LedgerEntry {
    return {
        _id: 'entry:test-id',
        type: 'entry',
        schema_version: version,
        schemaId: 'schema:test-id',
        ledgerId: 'schema:test-id',
        data,
        profileId: 'p1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

// ─── Unit tests: migrateEntryData ────────────────────────────────────────────

describe('migrateEntryData — unit', () => {
    it('returns didMigrate: false and identical entry reference when schema_version matches', () => {
        const schema = makeSchema(['name'], 3);
        const entry = makeEntry({ name: 'Alice' }, 3);
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        expect(didMigrate).toBe(false);
        expect(migrated).toBe(entry); // same reference
    });

    it('strips stale key that is no longer in schema.fields', () => {
        const schema = makeSchema(['name']); // version 2; 'age' removed
        const entry = makeEntry({ name: 'Alice', age: '30' }, 1);
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        expect(didMigrate).toBe(true);
        expect(migrated.data).not.toHaveProperty('age');
        expect(migrated.data).toHaveProperty('name', 'Alice');
    });

    it('does NOT inject a default for a newly-added schema field absent from entry.data', () => {
        // schema v2 adds 'email', entry was created with only 'name'
        const schema = makeSchema(['name', 'email']);
        const entry = makeEntry({ name: 'Alice' }, 1);
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        expect(didMigrate).toBe(true);
        expect(migrated.data).not.toHaveProperty('email');
        expect(migrated.data).toHaveProperty('name', 'Alice');
    });

    it('bumps schema_version on the migrated entry to match current schema', () => {
        const schema = makeSchema(['name'], 5);
        const entry = makeEntry({ name: 'Alice' }, 2);
        const { migrated } = migrateEntryData(entry, schema);
        expect(migrated.schema_version).toBe(5);
    });

    it('handles mixed case: strips multiple stale keys while preserving kept values', () => {
        const schema = makeSchema(['title', 'status']); // 'old1' and 'old2' removed
        const entry = makeEntry({ title: 'Report', status: 'open', old1: 'x', old2: 'y' }, 1);
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        expect(didMigrate).toBe(true);
        expect(migrated.data).toEqual({ title: 'Report', status: 'open' });
    });
});

// ─── Integration tests ───────────────────────────────────────────────────────

describe('list_entries — JIT migration integration', () => {
    it('strips stale field from returned entries after schema update removes a field', async () => {
        const db = await freshDb();
        // Create schema with two fields
        const schemaId = await create_schema(
            db,
            'Migrate Test',
            [{ name: 'title', type: 'text' }, { name: 'legacy', type: 'text' }],
            TEST_PROFILE_ID,
            'project:test'
        );
        // Create entry using original schema
        await create_entry(db, schemaId, schemaId, { title: 'Hello', legacy: 'old-value' }, TEST_PROFILE_ID);

        // Update schema: remove 'legacy' field
        await update_schema(db, schemaId, 'Migrate Test', [{ name: 'title', type: 'text' }]);

        // list_entries should return entry WITHOUT the stale 'legacy' field
        const entries = await list_entries(db, schemaId);
        expect(entries).toHaveLength(1);
        expect(entries[0].data).not.toHaveProperty('legacy');
        expect(entries[0].data).toHaveProperty('title', 'Hello');
    });

    it('write-back: subsequent get_entry reflects updated schema_version after list_entries migration', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(
            db,
            'Write-back Test',
            [{ name: 'name', type: 'text' }, { name: 'temp', type: 'text' }],
            TEST_PROFILE_ID,
            'project:test'
        );
        const entryId = await create_entry(db, schemaId, schemaId, { name: 'Bob', temp: 'bye' }, TEST_PROFILE_ID);

        // Remove 'temp' field — increments schema_version from 1 to 2
        await update_schema(db, schemaId, 'Write-back Test', [{ name: 'name', type: 'text' }]);

        // Trigger JIT migration via list_entries
        await list_entries(db, schemaId);

        // The persisted entry should now have schema_version === 2 (current schema version)
        const updated = await get_entry(db, entryId);
        expect(updated.schema_version).toBe(2);
    });
});

// ─── Integration tests: list_all_entries ─────────────────────────────────────

describe('list_all_entries — JIT migration integration', () => {
    it('applies JIT migration to active entries including bumping schema_version in returned result', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(
            db,
            'All-entries Migration Test',
            [{ name: 'title', type: 'text' }, { name: 'stale', type: 'text' }],
            TEST_PROFILE_ID,
            'project:test'
        );
        await create_entry(db, schemaId, schemaId, { title: 'Alpha', stale: 'old' }, TEST_PROFILE_ID);

        // Remove 'stale' field — increments schema_version from 1 to 2
        await update_schema(db, schemaId, 'All-entries Migration Test', [{ name: 'title', type: 'text' }]);

        const entries = await list_all_entries(db, schemaId);
        expect(entries).toHaveLength(1);
        expect(entries[0].data).not.toHaveProperty('stale');
        expect(entries[0].data).toHaveProperty('title', 'Alpha');
        expect(entries[0].schema_version).toBe(2);
    });

    it('does NOT write back soft-deleted entries — migrates in-memory only', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(
            db,
            'Soft-delete Migration Test',
            [{ name: 'name', type: 'text' }, { name: 'gone', type: 'text' }],
            TEST_PROFILE_ID,
            'project:test'
        );
        const entryId = await create_entry(db, schemaId, schemaId, { name: 'Ghost', gone: 'yes' }, TEST_PROFILE_ID);

        // Soft-delete the entry before schema update
        await delete_entry(db, entryId);

        // Remove 'gone' field — increments schema_version from 1 to 2
        await update_schema(db, schemaId, 'Soft-delete Migration Test', [{ name: 'name', type: 'text' }]);

        // list_all_entries should return migrated in-memory view for ghost reference detection
        const entries = await list_all_entries(db, schemaId);
        expect(entries).toHaveLength(1);
        expect(entries[0].data).not.toHaveProperty('gone');

        // The persisted document should NOT have been updated (schema_version remains 1)
        const persisted = await get_entry(db, entryId);
        expect(persisted.schema_version).toBe(1);
    });
});
