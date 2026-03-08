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
});
