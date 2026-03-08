import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTemplateStore } from './useTemplateStore';

const mockAddNotification = vi.fn();
const mockDispatchError = vi.fn();
const mockExportTemplate = vi.fn();
const mockGenerateFilename = vi.fn().mockReturnValue('test-2026-03-07.ledgy.json');
const mockDownloadBrowser = vi.fn();
const mockSaveTauri = vi.fn();
const mockIsTauri = vi.fn();

vi.mock('../lib/templateExport', () => ({
    export_template: (...args: any[]) => mockExportTemplate(...args),
    generateTemplateFilename: (...args: any[]) => mockGenerateFilename(...args),
    downloadTemplateBrowser: (...args: any[]) => mockDownloadBrowser(...args),
    saveTemplateTauri: (...args: any[]) => mockSaveTauri(...args),
    isTauri: () => mockIsTauri(),
}));

const mockImportTemplate = vi.fn();

vi.mock('../lib/templateImport', () => ({
    import_template: (...args: any[]) => mockImportTemplate(...args),
}));

vi.mock('./useProfileStore', () => ({
    useProfileStore: {
        getState: () => ({
            activeProfileId: 'profile-1',
            profiles: [{ id: 'profile-1', name: 'Test Profile' }],
        }),
    },
}));

vi.mock('../lib/db', () => ({
    getProfileDb: vi.fn().mockReturnValue({}),
}));

vi.mock('./useNotificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ addNotification: mockAddNotification }),
    },
}));

vi.mock('./useErrorStore', () => ({
    useErrorStore: {
        getState: () => ({ dispatchError: mockDispatchError }),
    },
}));

const mockTemplate = {
    exportVersion: '1.0' as const,
    exportedAt: '2026-03-07T00:00:00Z',
    profileName: 'Test Profile',
    schemas: [],
};

describe('useTemplateStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useTemplateStore.getState().reset();
        mockExportTemplate.mockResolvedValue(mockTemplate);
        mockGenerateFilename.mockReturnValue('test-2026-03-07.ledgy.json');
    });

    describe('exportTemplate - browser path', () => {
        it('transitions isExporting false → true → false and calls addNotification on success', async () => {
            mockIsTauri.mockReturnValue(false);
            mockDownloadBrowser.mockReturnValue(undefined);

            const exportingStates: boolean[] = [];
            const unsubscribe = useTemplateStore.subscribe((state) => {
                exportingStates.push(state.isExporting);
            });

            await useTemplateStore.getState().exportTemplate(true);

            unsubscribe();

            expect(exportingStates).toContain(true);
            expect(useTemplateStore.getState().isExporting).toBe(false);
            expect(mockAddNotification).toHaveBeenCalledWith('Template exported successfully', 'success');
            expect(mockDownloadBrowser).toHaveBeenCalledWith(mockTemplate, 'test-2026-03-07.ledgy.json');
        });
    });

    describe('exportTemplate - Tauri path', () => {
        it('calls saveTemplateTauri and fires success notification when path is returned', async () => {
            mockIsTauri.mockReturnValue(true);
            mockSaveTauri.mockResolvedValue('/some/path/test-2026-03-07.ledgy.json');

            await useTemplateStore.getState().exportTemplate(true);

            expect(mockSaveTauri).toHaveBeenCalledWith(mockTemplate, 'test-2026-03-07.ledgy.json');
            expect(mockAddNotification).toHaveBeenCalledWith('Template exported successfully', 'success');
            expect(useTemplateStore.getState().isExporting).toBe(false);
        });
    });

    describe('exportTemplate - Tauri cancel path', () => {
        it('aborts silently when saveTemplateTauri returns null (user cancelled)', async () => {
            mockIsTauri.mockReturnValue(true);
            mockSaveTauri.mockResolvedValue(null);

            await useTemplateStore.getState().exportTemplate(true);

            expect(mockAddNotification).not.toHaveBeenCalled();
            expect(mockDispatchError).not.toHaveBeenCalled();
            expect(useTemplateStore.getState().isExporting).toBe(false);
        });
    });

    describe('exportTemplate - error path', () => {
        it('dispatches error via useErrorStore and resets isExporting on failure', async () => {
            mockIsTauri.mockReturnValue(false);
            mockExportTemplate.mockRejectedValue(new Error('DB read failed'));

            await expect(useTemplateStore.getState().exportTemplate(true)).rejects.toThrow('DB read failed');

            expect(mockDispatchError).toHaveBeenCalledWith('DB read failed');
            expect(mockAddNotification).not.toHaveBeenCalled();
            expect(useTemplateStore.getState().isExporting).toBe(false);
        });
    });

    describe('reset()', () => {
        it('restores store to initialState', () => {
            useTemplateStore.setState({ isExporting: true, isImporting: true, error: 'some error' });

            useTemplateStore.getState().reset();

            const state = useTemplateStore.getState();
            expect(state.isExporting).toBe(false);
            expect(state.isImporting).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('importTemplate - success path', () => {
        it('calls import_template, fires addNotification with success, and resets isImporting', async () => {
            mockImportTemplate.mockResolvedValue({
                success: true,
                importedSchemas: 2,
                importedNodes: 0,
                conflicts: [],
                errors: [],
            });

            const importingStates: boolean[] = [];
            const unsubscribe = useTemplateStore.subscribe((state) => {
                importingStates.push(state.isImporting);
            });

            const result = await useTemplateStore.getState().importTemplate(mockTemplate, 'profile-1', 'project-1');

            unsubscribe();

            expect(importingStates).toContain(true);
            expect(useTemplateStore.getState().isImporting).toBe(false);
            expect(mockAddNotification).toHaveBeenCalledWith('Template imported successfully', 'success');
            expect(result.importedSchemas).toBe(2);
        });

        it('does NOT fire success notification when 0 schemas and 0 nodes imported (all conflicts)', async () => {
            mockImportTemplate.mockResolvedValue({
                success: true,
                importedSchemas: 0,
                importedNodes: 0,
                conflicts: [{ type: 'schema_exists', itemId: 'Assets', resolution: 'skip' }],
                errors: [],
            });

            await useTemplateStore.getState().importTemplate(mockTemplate, 'profile-1', 'project-1');

            expect(mockAddNotification).not.toHaveBeenCalled();
            expect(useTemplateStore.getState().isImporting).toBe(false);
        });

        it('dispatches per-schema errors individually via useErrorStore', async () => {
            mockImportTemplate.mockResolvedValue({
                success: false,
                importedSchemas: 1,
                importedNodes: 0,
                conflicts: [],
                errors: ['Failed to import schema "Assets": DB write failed', 'Failed to import schema "Liabilities": DB write failed'],
            });

            await useTemplateStore.getState().importTemplate(mockTemplate, 'profile-1', 'project-1');

            expect(mockDispatchError).toHaveBeenCalledTimes(2);
            expect(mockDispatchError).toHaveBeenCalledWith('Failed to import schema "Assets": DB write failed');
            expect(mockDispatchError).toHaveBeenCalledWith('Failed to import schema "Liabilities": DB write failed');
        });
    });

    describe('importTemplate - error path', () => {
        it('dispatches error via useErrorStore, resets isImporting, and rethrows on failure', async () => {
            mockImportTemplate.mockRejectedValue(new Error('DB import failed'));

            await expect(
                useTemplateStore.getState().importTemplate(mockTemplate, 'profile-1', 'project-1')
            ).rejects.toThrow('DB import failed');

            expect(mockDispatchError).toHaveBeenCalledWith('DB import failed');
            expect(mockAddNotification).not.toHaveBeenCalled();
            expect(useTemplateStore.getState().isImporting).toBe(false);
        });
    });
});
