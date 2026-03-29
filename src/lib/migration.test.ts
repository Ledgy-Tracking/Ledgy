import { describe, it, expect } from 'vitest';
import { migrateEntryData } from './migration';
import type { LedgerEntry, LedgerSchema } from '../types/ledger';

describe('migrateEntryData', () => {
    // Helper to create a base entry
    const createEntry = (schema_version: number, data: Record<string, unknown>): LedgerEntry => ({
        _id: 'entry:123',
        type: 'entry',
        schemaId: 'schema:123',
        ledgerId: 'ledger:123',
        profileId: 'profile:123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        schema_version,
        data,
    });

    // Helper to create a base schema
    const createSchema = (schema_version: number, fields: string[]): LedgerSchema => ({
        _id: 'schema:123',
        type: 'schema',
        name: 'Test Schema',
        profileId: 'profile:123',
        projectId: 'project:123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        schema_version,
        fields: fields.map(name => ({ name, type: 'text' })),
    });

    it('returns without migrating if entry schema_version matches schema schema_version', () => {
        const entry = createEntry(1, { foo: 'bar' });
        const schema = createSchema(1, ['foo']);

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(false);
        expect(result.migrated).toBe(entry); // Should return the exact same object reference
    });

    it('returns without migrating if entry schema_version is greater than schema schema_version', () => {
        const entry = createEntry(2, { foo: 'bar' });
        const schema = createSchema(1, ['foo']);

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(false);
        expect(result.migrated).toBe(entry);
    });

    it('migrates and keeps fields that exist in the new schema', () => {
        const entry = createEntry(1, { foo: 'bar', baz: 123 });
        const schema = createSchema(2, ['foo', 'baz']);

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({ foo: 'bar', baz: 123 });
    });

    it('migrates and strips fields that no longer exist in the new schema', () => {
        const entry = createEntry(1, { foo: 'bar', oldField: 'removeMe' });
        const schema = createSchema(2, ['foo']); // 'oldField' is removed

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({ foo: 'bar' });
        expect(result.migrated.data).not.toHaveProperty('oldField');
    });

    it('migrates and omits new fields added to the schema (no default injection)', () => {
        const entry = createEntry(1, { foo: 'bar' });
        const schema = createSchema(2, ['foo', 'newField']); // 'newField' is added

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({ foo: 'bar' });
        expect(result.migrated.data).not.toHaveProperty('newField');
    });

    it('handles migrating an entry with empty data', () => {
        const entry = createEntry(1, {});
        const schema = createSchema(2, ['foo']);

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({});
    });

    it('handles migrating when the new schema has no fields (strips everything)', () => {
        const entry = createEntry(1, { foo: 'bar', baz: 123 });
        const schema = createSchema(2, []);

        const result = migrateEntryData(entry, schema);

        expect(result.didMigrate).toBe(true);
        expect(result.migrated.schema_version).toBe(2);
        expect(result.migrated.data).toEqual({});
    });
});
