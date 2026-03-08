import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate_template, import_template } from './templateImport';
import { create_schema, list_schemas, save_canvas } from './db';

vi.mock('./db', () => ({
    create_schema: vi.fn().mockResolvedValue('schema:test-id'),
    list_schemas: vi.fn().mockResolvedValue([]),
    save_canvas: vi.fn().mockResolvedValue('canvas:default'),
}));

const mockCreateSchema = vi.mocked(create_schema);
const mockListSchemas = vi.mocked(list_schemas);
const mockSaveCanvas = vi.mocked(save_canvas);

const mockDb = {} as any;
const profileId = 'profile-1';
const projectId = 'project-1';

const validTemplate = {
    exportVersion: '1.0' as const,
    exportedAt: '2026-03-08T00:00:00Z',
    profileName: 'Test Profile',
    schemas: [
        { _id: 'schema:1', type: 'schema' as const, schema_version: 1, name: 'Assets', fields: [], profileId, projectId, createdAt: '', updatedAt: '' },
        { _id: 'schema:2', type: 'schema' as const, schema_version: 1, name: 'Liabilities', fields: [], profileId, projectId, createdAt: '', updatedAt: '' },
    ],
};

describe('validate_template', () => {
    it('accepts a valid TemplateExport', () => {
        expect(validate_template(validTemplate)).toBe(true);
    });

    it('rejects null', () => {
        expect(validate_template(null)).toBe(false);
    });

    it('rejects missing schemas field', () => {
        const bad = { exportVersion: '1.0', exportedAt: '', profileName: '' };
        expect(validate_template(bad)).toBe(false);
    });

    it('rejects exportVersion !== "1.0"', () => {
        const bad = { ...validTemplate, exportVersion: '2.0' };
        expect(validate_template(bad)).toBe(false);
    });

    it('rejects schema with missing name', () => {
        const bad = {
            ...validTemplate,
            schemas: [{ name: '', fields: [] }],
        };
        expect(validate_template(bad)).toBe(false);
    });

    it('rejects schema with missing fields array', () => {
        const bad = {
            ...validTemplate,
            schemas: [{ name: 'Assets' }],
        };
        expect(validate_template(bad)).toBe(false);
    });

    it('rejects empty schemas array', () => {
        const bad = { ...validTemplate, schemas: [] };
        expect(validate_template(bad)).toBe(false);
    });
});

describe('import_template', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListSchemas.mockResolvedValue([]);
        mockCreateSchema.mockResolvedValue('schema:new-id');
        mockSaveCanvas.mockResolvedValue('canvas:default');
    });

    it('success (schemas only) — imports all schemas, no conflicts, no errors', async () => {
        const result = await import_template(mockDb, validTemplate, profileId, projectId);

        expect(result.importedSchemas).toBe(2);
        expect(result.conflicts).toEqual([]);
        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        expect(mockCreateSchema).toHaveBeenCalledTimes(2);
        expect(mockSaveCanvas).not.toHaveBeenCalled();
    });

    it('success (schemas + nodeGraph) — imports schemas and saves canvas', async () => {
        const templateWithGraph = {
            ...validTemplate,
            nodeGraph: {
                nodes: [{ id: 'n1' }, { id: 'n2' }] as any,
                edges: [] as any,
                viewport: { x: 0, y: 0, zoom: 1 },
            },
        };

        const result = await import_template(mockDb, templateWithGraph, profileId, projectId);

        expect(result.importedSchemas).toBe(2);
        expect(result.importedNodes).toBe(2);
        expect(mockSaveCanvas).toHaveBeenCalledWith(
            mockDb,
            'default',
            templateWithGraph.nodeGraph.nodes,
            templateWithGraph.nodeGraph.edges,
            templateWithGraph.nodeGraph.viewport,
            profileId
        );
    });

    it('conflict detection — skips schemas that already exist by name', async () => {
        mockListSchemas.mockResolvedValue([
            { _id: 'schema:existing', type: 'schema', schema_version: 1, name: 'Assets', fields: [], profileId, projectId, createdAt: '', updatedAt: '' },
        ] as any);

        const result = await import_template(mockDb, validTemplate, profileId, projectId);

        expect(result.importedSchemas).toBe(1); // Only 'Liabilities' imported
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0]).toEqual({
            type: 'schema_exists',
            itemId: 'Assets',
            resolution: 'skip',
        });
    });

    it('error path — records error per failing schema and continues; no rethrow', async () => {
        mockCreateSchema
            .mockRejectedValueOnce(new Error('DB write failed'))
            .mockResolvedValueOnce('schema:ok');

        const result = await import_template(mockDb, validTemplate, profileId, projectId);

        expect(result.importedSchemas).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Assets');
        expect(result.errors[0]).toContain('DB write failed');
        expect(result.success).toBe(false);
    });
});
