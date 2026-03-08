import { describe, it, expect, afterAll } from 'vitest';
import PouchDB from 'pouchdb';
import {
    getProfileDb,
    _clearProfileDatabases,
    create_schema,
    get_schema,
    create_entry,
    update_entry,
    get_entry,
    list_entries,
} from '../src/lib/db';
import {
    validateEntryAgainstSchema,
    buildZodSchemaFromLedger,
    ValidationError,
} from '../src/lib/validation';
import type { SchemaField } from '../src/types/ledger';

const TEST_PROFILE_DB_NAME = 'ledgy_profile_test-validation-v1';
const TEST_PROFILE_ID = 'test-validation-v1';

async function freshDb() {
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

async function makeSchema(db: Awaited<ReturnType<typeof freshDb>>, fields: SchemaField[]) {
    const id = await create_schema(db, 'TestSchema', fields, TEST_PROFILE_ID, 'proj:test');
    return get_schema(db, id);
}

describe('Schema Strict Validation Engine', () => {

    // Task 4.3: field type mapping
    it('buildZodSchemaFromLedger maps text, number, date, relation fields correctly', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'title', type: 'text', required: true },
            { name: 'count', type: 'number', required: true },
            { name: 'birthday', type: 'date', required: true },
            { name: 'relId', type: 'relation', required: true },
        ]);

        const valid = {
            title: 'Hello',
            count: 42,
            birthday: '2024-01-15',
            relId: 'entry:abc-123',
        };
        expect(() => validateEntryAgainstSchema(valid, schema)).not.toThrow();
    });

    // Task 4.4: required text field missing → throws ValidationError with field name
    it('required text field: missing value throws ValidationError with field name', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'name', type: 'text', required: true },
        ]);

        let caught: unknown;
        try {
            validateEntryAgainstSchema({}, schema);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(ValidationError);
        expect((caught as ValidationError).message).toContain('name');
    });

    // Task 4.5: optional text field missing → does not throw
    it('optional text field: missing value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'nickname', type: 'text' }, // required not set → optional
        ]);
        expect(() => validateEntryAgainstSchema({}, schema)).not.toThrow();
    });

    // Task 4.6: number field receiving string → throws ValidationError
    it('number field with string input: throws ValidationError mentioning the field', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'count', type: 'number', required: true },
        ]);

        let caught: unknown;
        try {
            validateEntryAgainstSchema({ count: 'five' }, schema);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(ValidationError);
        expect((caught as ValidationError).message).toContain('count');
    });

    // Task 4.7: extra fields stripped
    it('extra fields stripped from output, no error thrown', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'name', type: 'text', required: true },
        ]);
        const result = validateEntryAgainstSchema({ name: 'x', extra: 'y' }, schema);
        expect(result).toEqual({ name: 'x' });
        expect('extra' in result).toBe(false);
    });

    // Task 4.8: all violations reported
    it('ValidationError message lists ALL failing fields, not just the first', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'firstName', type: 'text', required: true },
            { name: 'lastName', type: 'text', required: true },
        ]);

        let caught: unknown;
        try {
            validateEntryAgainstSchema({}, schema);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(ValidationError);
        const msg = (caught as ValidationError).message;
        expect(msg).toContain('firstName');
        expect(msg).toContain('lastName');
    });

    // Task 4.9: integration — create_entry with invalid data: throws, list_entries returns empty
    it('create_entry with invalid data: throws ValidationError, list_entries returns empty', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Strict Schema', [
            { name: 'amount', type: 'number', required: true },
        ], TEST_PROFILE_ID, 'proj:test');

        await expect(
            create_entry(db, schemaId, schemaId, { amount: 'not-a-number' }, TEST_PROFILE_ID)
        ).rejects.toThrow(ValidationError);

        const entries = await list_entries(db, schemaId);
        expect(entries).toHaveLength(0);
    });

    // Task 4.10: integration — update_entry with invalid data: throws, original unchanged
    it('update_entry with invalid data: throws ValidationError, original entry unchanged', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Strict Schema 2', [
            { name: 'price', type: 'number', required: true },
        ], TEST_PROFILE_ID, 'proj:test');

        const entryId = await create_entry(db, schemaId, schemaId, { price: 99 }, TEST_PROFILE_ID);

        await expect(
            update_entry(db, entryId, { price: 'wrong' })
        ).rejects.toThrow(ValidationError);

        const entry = await get_entry(db, entryId);
        expect((entry.data as any).price).toBe(99);
    });

    // Task 4.11: integration — valid round-trip
    it('valid data: create_entry then get_entry succeeds', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Round-trip Schema', [
            { name: 'label', type: 'text', required: true },
        ], TEST_PROFILE_ID, 'proj:test');

        const entryId = await create_entry(db, schemaId, schemaId, { label: 'test-value' }, TEST_PROFILE_ID);
        const entry = await get_entry(db, entryId);
        expect((entry.data as any).label).toBe('test-value');
    });

    // Task 4.12: empty schema — any data passes (all stripped, no required fields to fail)
    it('empty schema: validateEntryAgainstSchema does not throw, all data stripped', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, []);
        expect(() => validateEntryAgainstSchema({ anything: 'x' }, schema)).not.toThrow();
        const result = validateEntryAgainstSchema({ anything: 'x' }, schema);
        expect(result).toEqual({});
    });

    // Additional: valid date field
    it('date field with invalid date string throws ValidationError', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'createdOn', type: 'date', required: true },
        ]);
        let caught: unknown;
        try {
            validateEntryAgainstSchema({ createdOn: 'not-a-date' }, schema);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(ValidationError);
    });

    // AC7: Encryption paths also validated — validation runs BEFORE encryptPayload
    it('create_entry with encryptionKey and invalid data: throws ValidationError, not a crypto error', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Encrypted Strict Schema', [
            { name: 'amount', type: 'number', required: true },
        ], TEST_PROFILE_ID, 'proj:test');

        // mockKey is never reached — ValidationError is thrown before encryption
        const mockKey = {} as unknown as CryptoKey;

        await expect(
            create_entry(db, schemaId, schemaId, { amount: 'not-a-number' }, TEST_PROFILE_ID, mockKey)
        ).rejects.toThrow(ValidationError);

        const entries = await list_entries(db, schemaId);
        expect(entries).toHaveLength(0);
    });

    it('update_entry with encryptionKey and invalid data: throws ValidationError, original entry unchanged', async () => {
        const db = await freshDb();
        const schemaId = await create_schema(db, 'Encrypted Update Schema', [
            { name: 'price', type: 'number', required: true },
        ], TEST_PROFILE_ID, 'proj:test');

        const entryId = await create_entry(db, schemaId, schemaId, { price: 50 }, TEST_PROFILE_ID);

        // mockKey is never reached — ValidationError is thrown before encryption
        const mockKey = {} as unknown as CryptoKey;

        await expect(
            update_entry(db, entryId, { price: 'wrong' }, mockKey)
        ).rejects.toThrow(ValidationError);

        const entry = await get_entry(db, entryId);
        expect((entry.data as any).price).toBe(50);
    });

    // Story 3-4: text field with minLength constraint
    it('text field with minLength: short value throws, long value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'title', type: 'text', required: true, minLength: 5 },
        ]);
        expect(() => validateEntryAgainstSchema({ title: 'abc' }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ title: 'abcdef' }, schema)).not.toThrow();
    });

    // Story 3-4: text field with maxLength constraint
    it('text field with maxLength: long value throws, short value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'title', type: 'text', required: true, maxLength: 10 },
        ]);
        expect(() => validateEntryAgainstSchema({ title: 'hello world' }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ title: 'hello' }, schema)).not.toThrow();
    });

    // Story 3-4: text field with pattern constraint
    it('text field with pattern: non-matching value throws, matching value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'code', type: 'text', required: true, pattern: '^[A-Z]' },
        ]);
        expect(() => validateEntryAgainstSchema({ code: 'hello' }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ code: 'Hello' }, schema)).not.toThrow();
    });

    // Story 3-4: long_text field with maxLength constraint
    it('long_text field with maxLength: long value throws, short value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'bio', type: 'long_text', required: true, maxLength: 20 },
        ]);
        expect(() => validateEntryAgainstSchema({ bio: 'a'.repeat(25) }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ bio: 'a'.repeat(15) }, schema)).not.toThrow();
    });

    // Story 3-4: number field with min constraint
    it('number field with min: below-min value throws, min value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'score', type: 'number', required: true, min: 0 },
        ]);
        expect(() => validateEntryAgainstSchema({ score: -1 }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ score: 0 }, schema)).not.toThrow();
    });

    // Story 3-4: number field with max constraint
    it('number field with max: above-max value throws, max value passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'percent', type: 'number', required: true, max: 100 },
        ]);
        expect(() => validateEntryAgainstSchema({ percent: 101 }, schema)).toThrow(ValidationError);
        expect(() => validateEntryAgainstSchema({ percent: 100 }, schema)).not.toThrow();
    });

    // Story 3-4: number field with min and max constraints
    it('number field with min and max: value in range passes', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'rating', type: 'number', required: true, min: 0, max: 100 },
        ]);
        expect(() => validateEntryAgainstSchema({ rating: 50 }, schema)).not.toThrow();
    });

    // Story 3-4: invalid regex pattern — constraint skipped, both values pass
    it('invalid regex pattern: buildZodSchemaFromLedger does not throw, constraint skipped', async () => {
        const db = await freshDb();
        const schema = await makeSchema(db, [
            { name: 'code', type: 'text', required: true, pattern: '[invalid' },
        ]);
        expect(() => validateEntryAgainstSchema({ code: 'hello' }, schema)).not.toThrow();
        expect(() => validateEntryAgainstSchema({ code: 'Hello' }, schema)).not.toThrow();
    });
});
