import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    export_template,
    generateTemplateFilename,
    downloadTemplateBrowser,
    isTauri,
} from './templateExport';
import { Database } from './db';

// Mock Database
vi.mock('./db', () => ({
    Database: vi.fn(),
    list_schemas: vi.fn(),
    load_canvas: vi.fn(),
}));

describe('templateExport', () => {
    const mockDb = {} as Database;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('export_template', () => {
        it('exports schemas without entries', async () => {
            const { list_schemas } = await import('./db');
            vi.mocked(list_schemas).mockResolvedValue([
                {
                    _id: 'schema:1',
                    type: 'schema',
                    name: 'Test Schema',
                    fields: [{ name: 'Field1', type: 'text' }],
                    profileId: 'profile-1',
                    projectId: 'project-1',
                    schemaVersion: 1,
                    createdAt: '2026-02-23T00:00:00Z',
                    updatedAt: '2026-02-23T00:00:00Z',
                },
            ]);

            const { load_canvas } = await import('./db');
            vi.mocked(load_canvas).mockResolvedValue(null);

            const result = await export_template(mockDb, false, 'Test Profile');

            expect(result.exportVersion).toBe('1.0');
            expect(result.profileName).toBe('Test Profile');
            expect(result.schemas).toHaveLength(1);
            expect(result.schemas[0].name).toBe('Test Schema');
            expect(result.nodeGraph).toBeUndefined();
        });

        it('includes node graph when requested', async () => {
            const { list_schemas, load_canvas } = await import('./db');
            vi.mocked(list_schemas).mockResolvedValue([]);
            vi.mocked(load_canvas).mockResolvedValue({
                _id: 'canvas:default',
                type: 'canvas',
                profileId: 'profile-1',
                canvasId: 'default',
                schemaVersion: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
                nodes: [{ id: 'node-1', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Test' } }],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
            });

            const result = await export_template(mockDb, true, 'Test Profile');

            expect(result.nodeGraph).toBeDefined();
            expect(result.nodeGraph?.nodes).toHaveLength(1);
        });

        it('handles missing canvas gracefully', async () => {
            const { list_schemas, load_canvas } = await import('./db');
            vi.mocked(list_schemas).mockResolvedValue([]);
            vi.mocked(load_canvas).mockRejectedValue({ status: 404 });

            const result = await export_template(mockDb, true, 'Test Profile');

            expect(result.nodeGraph).toBeUndefined();
        });
    });

    describe('generateTemplateFilename', () => {
        it('generates filename with profile name and date', () => {
            const date = new Date('2026-02-23T10:00:00Z');
            const filename = generateTemplateFilename('My Profile', date);

            expect(filename).toBe('my-profile-2026-02-23.ledgy.json');
        });

        it('sanitizes special characters in profile name', () => {
            const date = new Date('2026-02-23T10:00:00Z');
            const filename = generateTemplateFilename('Test @#$ Profile!', date);

            expect(filename).toBe('test-profile-2026-02-23.ledgy.json');
        });

        it('uses current date when not provided', () => {
            const filename = generateTemplateFilename('Test');

            expect(filename).toMatch(/test-\d{4}-\d{2}-\d{2}\.ledgy\.json/);
        });
    });

    // Skip: jsdom doesn't properly support DOM node creation/click simulation
    describe.skip('downloadTemplateBrowser', () => {
        it('creates download link with correct attributes', () => {
            const template: any = { exportVersion: '1.0', schemas: [] };
            const filename = 'test.ledgy.json';

            // Mock document methods
            const mockLink = {
                href: '',
                download: '',
                click: vi.fn(),
            };
            const createElementSpy = vi.spyOn(document, 'createElement');
            createElementSpy.mockReturnValue(mockLink as any);

            // Mock body methods to avoid jsdom issues
            const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
            const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));

            downloadTemplateBrowser(template, filename);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(mockLink.download).toBe(filename);
            expect(mockLink.click).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalledWith(mockLink);

            // Restore
            appendChildSpy.mockRestore();
            removeChildSpy.mockRestore();
        });
    });

    describe('isTauri', () => {
        afterEach(() => {
            // Restore original window
            delete (window as any).__TAURI__;
        });

        it('returns true when __TAURI__ exists', () => {
            (window as any).__TAURI__ = {};
            expect(isTauri()).toBe(true);
        });

        it('returns false when __TAURI__ does not exist', () => {
            expect(isTauri()).toBe(false);
        });
    });
});
