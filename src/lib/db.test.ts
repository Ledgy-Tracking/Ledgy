import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getProfileDb, _clearProfileDatabases } from './db';
import PouchDB from 'pouchdb';
import { useErrorStore } from '../stores/useErrorStore';

describe('Database Isolation', () => {
    beforeEach(async () => {
        // Clear databases before each test
        const db1 = new PouchDB('ledgy_profile_test1');
        const db2 = new PouchDB('ledgy_profile_test2');
        await db1.destroy();
        await db2.destroy();
        _clearProfileDatabases();
    });

    // Cleanup: Destroy all test databases after all tests complete
    afterAll(async () => {
        const testDbs = [
            'ledgy_profile_test1',
            'ledgy_profile_test2',
            'ledgy_profile_test-scheme',
            'ledgy_profile_test-envelope',
        ];
        for (const dbName of testDbs) {
            try {
                const db = new PouchDB(dbName);
                await db.destroy();
            } catch (e) {
                // Ignore errors - database might not exist
            }
        }
        _clearProfileDatabases();
    });

    it('should maintain isolation between different profiles', async () => {
        const profile1Db = getProfileDb('test1');
        const profile2Db = getProfileDb('test2');

        // Create a document in profile 1
        await profile1Db.createDocument('test', { secret: 'p1-data' });

        // profile 2 should be empty
        const p2Docs = await profile2Db.getAllDocuments('test');
        expect(p2Docs).toHaveLength(0);

        // profile 1 should have 1 document
        const p1Docs = await profile1Db.getAllDocuments('test');
        expect(p1Docs).toHaveLength(1);
        expect((p1Docs[0] as any).secret).toBe('p1-data');
    });

    it('should use the correct ID scheme {type}:{uuid}', async () => {
        const db = getProfileDb('test-scheme');
        const response = await db.createDocument('profile', { name: 'Test' });

        expect(response.id).toMatch(/^profile:[0-9a-f-]{36}$/);
    });

    it('should include standard envelope fields', async () => {
        const db = getProfileDb('test-envelope');
        await db.createDocument('entry', { value: 100 });

        const docs = await db.getAllDocuments<any>('entry');
        const doc = docs[0];

        expect(doc.type).toBe('entry');
        expect(doc.schema_version).toBe(1);
        expect(doc.createdAt).toBeDefined();
        expect(doc.updatedAt).toBeDefined();
        expect(new Date(doc.createdAt).getTime()).not.toBeNaN();
    });
});

describe('Database.createDocument', () => {
    beforeEach(async () => {
        const db1 = new PouchDB('ledgy_profile_test_create');
        await db1.destroy();
        _clearProfileDatabases();
        useErrorStore.setState({ error: null });
    });

    afterAll(async () => {
        try {
            const db = new PouchDB('ledgy_profile_test_create');
            await db.destroy();
        } catch (e) {
            // Ignore errors
        }
        _clearProfileDatabases();
    });

    it('should successfully create a document with standard envelope', async () => {
        const db = getProfileDb('test_create');
        const response = await db.createDocument('test_type', { foo: 'bar' });

        expect(response.ok).toBe(true);
        expect(response.id).toMatch(/^test_type:[0-9a-f-]{36}$/);

        const doc = await db.getDocument<any>(response.id);
        expect(doc.type).toBe('test_type');
        expect(doc.foo).toBe('bar');
        expect(doc.schema_version).toBe(1);
        expect(doc.createdAt).toBeDefined();
        expect(doc.updatedAt).toBeDefined();
    });

    it('should throw an error when data contains reserved PouchDB fields', async () => {
        const db = getProfileDb('test_create');

        await expect(db.createDocument('test_type', { _invalid: 'value' }))
            .rejects.toThrow('Invalid field "_invalid": Fields starting with "_" are reserved for PouchDB internal use');

        // Allowed reserved fields should not throw in validation, but createDocument omits them via envelope
        // Actually the validation function allows _id, _rev, _deleted
        // but passing them to createDocument could be weird. The requirement is just testing the validation.
    });

    it('should dispatch error to store and throw on db.put failure', async () => {
        const db = getProfileDb('test_create');

        // Mock the internal db.put
        const mockPut = vi.fn().mockRejectedValue(new Error('Simulated DB Error'));
        (db as any).db.put = mockPut;

        await expect(db.createDocument('test_type', { foo: 'bar' }))
            .rejects.toThrow('Simulated DB Error');

        const errorState = useErrorStore.getState().error;
        expect(errorState).not.toBeNull();
        expect(errorState?.message).toBe('Simulated DB Error');
        expect(errorState?.type).toBe('error');
    });
});
