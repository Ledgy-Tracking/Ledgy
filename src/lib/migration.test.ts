import { describe, it, expect } from 'vitest';
import { migrateEntryData } from './migration';
import type { LedgerEntry, LedgerSchema, SchemaField } from '../types/ledger';

describe('migrateEntryData', () => {
    // Helper to create a mock schema
    const createSchema = (version: number, fields: SchemaField[]): LedgerSchema => ({
        _id: 'schema:123',
        type: 'schema',
        schema_version: version,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        name: 'Test Schema',
        fields,
        profileId: 'profile:1',
        projectId: 'project:1',
    });

    // Helper to create a mock entry
    const createEntry = (version: number, data: Record<string, unknown>): LedgerEntry => ({
        _id: 'entry:123',
        type: 'entry',
        schema_version: version,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        schemaId: 'schema:123',
        ledgerId: 'ledger:1',
        data,
        profileId: 'profile:1',
    });

    it('returns didMigrate: false and the original entry if entry.schema_version >= schema.schema_version', () => {
        const schema = createSchema(1, [{ name: 'field1', type: 'text' }]);
        const entry = createEntry(1, { field1: 'value1' });

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(false);
        expect(result.migrated).toBe(entry); // Identity check
    });

    it('strips keys from entry.data that are no longer present in schema.fields', () => {
        const schema = createSchema(2, [{ name: 'field2', type: 'text' }]);
        const entry = createEntry(1, { field1: 'value1', field2: 'value2', field3: 'value3' });

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({ field2: 'value2' });
    });

    it('does not inject default values for newly added schema fields (they remain absent)', () => {
        const schema = createSchema(2, [
            { name: 'field1', type: 'text' },
            { name: 'newField', type: 'text' }
        ]);
        const entry = createEntry(1, { field1: 'value1' });

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({ field1: 'value1' });
        expect(result.migrated.data).not.toHaveProperty('newField');
    });

    it('handles an entry with an empty data object', () => {
        const schema = createSchema(2, [{ name: 'field1', type: 'text' }]);
        const entry = createEntry(1, {});

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({});
    });

    it('preserves fields correctly when data contains falsy values', () => {
        const schema = createSchema(2, [
            { name: 'field1', type: 'text' },
            { name: 'field2', type: 'number' },
            { name: 'field3', type: 'boolean' }
        ]);

        const entry = createEntry(1, {
            field1: '',
            field2: 0,
            field3: false
        });

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({
            field1: '',
            field2: 0,
            field3: false
        });
    });
});
