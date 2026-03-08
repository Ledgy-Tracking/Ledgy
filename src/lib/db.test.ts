import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getProfileDb, _clearProfileDatabases } from './db';
import PouchDB from 'pouchdb';

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
