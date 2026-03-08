import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSchemaBuilderStore } from '../src/stores/useSchemaBuilderStore';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useErrorStore } from '../src/stores/useErrorStore';
import type { LedgerSchema } from '../src/types/ledger';

vi.mock('../src/stores/useLedgerStore');
vi.mock('../src/stores/useErrorStore');

const mockDispatchError = vi.fn();
const mockCreateSchema = vi.fn();
const mockUpdateSchema = vi.fn();

describe('useSchemaBuilderStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset real store state before each test
        useSchemaBuilderStore.getState().discard();

        (useErrorStore as any).getState = vi.fn().mockReturnValue({
            dispatchError: mockDispatchError,
        });

        (useLedgerStore as any).getState = vi.fn().mockReturnValue({
            createSchema: mockCreateSchema,
            updateSchema: mockUpdateSchema,
            schemas: [],
        });
    });

    // AC 4.3: initCreate resets state correctly
    it('initCreate resets state correctly', () => {
        useSchemaBuilderStore.getState().initCreate('project-abc');

        const state = useSchemaBuilderStore.getState();
        expect(state.draftName).toBe('');
        expect(state.draftFields).toEqual([]);
        expect(state.isDirty).toBe(false);
        expect(state.mode).toBe('create');
        expect(state.projectId).toBe('project-abc');
        expect(state.editingSchemaId).toBeNull();
    });

    // AC 4.4: initEdit loads schema fields correctly and isDirty is false after init
    it('initEdit loads schema fields correctly and deep-copies fields', () => {
        const mockSchema: LedgerSchema = {
            _id: 'schema-1',
            type: 'schema',
            name: 'Test Schema',
            fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'count', type: 'number', required: false },
            ],
            profileId: 'profile-1',
            projectId: 'project-1',
            schema_version: 1,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        };

        useSchemaBuilderStore.getState().initEdit(mockSchema);

        const state = useSchemaBuilderStore.getState();
        expect(state.draftName).toBe('Test Schema');
        expect(state.draftFields).toEqual(mockSchema.fields);
        expect(state.isDirty).toBe(false);
        expect(state.mode).toBe('edit');
        expect(state.editingSchemaId).toBe('schema-1');

        // Verify deep copy: mutating store fields should NOT affect original schema
        expect(state.draftFields).not.toBe(mockSchema.fields);
        expect(state.draftFields[0]).not.toBe(mockSchema.fields[0]);
    });

    // AC 4.5: setDraftName updates name and marks dirty
    it('setDraftName updates name and marks dirty', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().setDraftName('New Name');

        const state = useSchemaBuilderStore.getState();
        expect(state.draftName).toBe('New Name');
        expect(state.isDirty).toBe(true);
    });

    // AC 4.6: addField adds blank field
    it('addField adds a blank field with correct defaults', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();

        const state = useSchemaBuilderStore.getState();
        expect(state.draftFields).toHaveLength(1);
        expect(state.draftFields[0]).toEqual({ name: '', type: 'text', required: false });
        expect(state.isDirty).toBe(true);
    });

    // AC 4.7: removeField removes correct index
    it('removeField removes field at given index', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { name: 'First' });
        useSchemaBuilderStore.getState().updateField(1, { name: 'Second' });

        useSchemaBuilderStore.getState().removeField(0);

        const state = useSchemaBuilderStore.getState();
        expect(state.draftFields).toHaveLength(1);
        expect(state.draftFields[0].name).toBe('Second');
    });

    // AC 4.8: removeField out-of-bounds is a no-op
    it('removeField with out-of-bounds index is a no-op', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();

        useSchemaBuilderStore.getState().removeField(99);

        expect(useSchemaBuilderStore.getState().draftFields).toHaveLength(1);
    });

    // AC 4.9: updateField merges patch; relation target cleared when type changes away from 'relation'
    it('updateField clears relationTarget when type changes away from relation', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { type: 'relation', relationTarget: 'some-schema-id' });

        expect(useSchemaBuilderStore.getState().draftFields[0].relationTarget).toBe('some-schema-id');

        useSchemaBuilderStore.getState().updateField(0, { type: 'text' });

        const state = useSchemaBuilderStore.getState();
        expect(state.draftFields[0].type).toBe('text');
        expect(state.draftFields[0].relationTarget).toBeUndefined();
    });

    // AC 4.10: reorderField swaps positions correctly
    it('reorderField moves field from index 2 to index 0', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { name: 'A' });
        useSchemaBuilderStore.getState().updateField(1, { name: 'B' });
        useSchemaBuilderStore.getState().updateField(2, { name: 'C' });

        useSchemaBuilderStore.getState().reorderField(2, 0);

        const { draftFields } = useSchemaBuilderStore.getState();
        expect(draftFields[0].name).toBe('C');
        expect(draftFields[1].name).toBe('A');
        expect(draftFields[2].name).toBe('B');
    });

    // AC 4.11: reorderField out-of-bounds is a no-op
    it('reorderField with out-of-bounds toIndex is a no-op', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { name: 'OnlyField' });

        useSchemaBuilderStore.getState().reorderField(0, 99);

        const { draftFields } = useSchemaBuilderStore.getState();
        expect(draftFields).toHaveLength(1);
        expect(draftFields[0].name).toBe('OnlyField');
    });

    // AC 4.12: discard resets everything to initial state
    it('discard resets state to initial', () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().setDraftName('Some Name');
        useSchemaBuilderStore.getState().addField();

        useSchemaBuilderStore.getState().discard();

        const state = useSchemaBuilderStore.getState();
        expect(state.draftName).toBe('');
        expect(state.draftFields).toEqual([]);
        expect(state.isDirty).toBe(false);
        expect(state.mode).toBe('create');
        expect(state.editingSchemaId).toBeNull();
        expect(state.error).toBeNull();
    });

    // AC 4.13: commit with empty name dispatches error, isLoading stays false
    it('commit with empty name dispatches error and isLoading stays false', async () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        // draftName is '' after initCreate

        await useSchemaBuilderStore.getState().commit('profile-1');

        expect(mockDispatchError).toHaveBeenCalledWith('Schema name is required');
        expect(useSchemaBuilderStore.getState().isLoading).toBe(false);
        expect(useSchemaBuilderStore.getState().error).toBe('Schema name is required');
    });

    // AC 4.14: commit with empty fields dispatches error
    it('commit with empty fields dispatches error', async () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().setDraftName('Valid Name');
        // draftFields is [] after initCreate

        await useSchemaBuilderStore.getState().commit('profile-1');

        expect(mockDispatchError).toHaveBeenCalledWith('At least one field is required');
        expect(useSchemaBuilderStore.getState().error).toBe('At least one field is required');
    });

    // AC 4.15: commit with relation field missing target dispatches error
    it('commit with relation field missing target dispatches error', async () => {
        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().setDraftName('My Schema');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { name: 'Link', type: 'relation' });

        await useSchemaBuilderStore.getState().commit('profile-1');

        expect(mockDispatchError).toHaveBeenCalledWith('Relation target required for field "Link"');
        expect(useSchemaBuilderStore.getState().error).toContain('Relation target required');
    });

    // Additional: commit in create mode calls createSchema on success
    it('commit in create mode calls createSchema and clears dirty/error on success', async () => {
        mockCreateSchema.mockResolvedValue('new-schema-id');

        useSchemaBuilderStore.getState().initCreate('project-1');
        useSchemaBuilderStore.getState().setDraftName('My Schema');
        useSchemaBuilderStore.getState().addField();
        useSchemaBuilderStore.getState().updateField(0, { name: 'Title', type: 'text' });

        await useSchemaBuilderStore.getState().commit('profile-1');

        expect(mockCreateSchema).toHaveBeenCalledWith(
            'profile-1',
            'project-1',
            'My Schema',
            expect.arrayContaining([expect.objectContaining({ name: 'Title', type: 'text' })])
        );
        expect(useSchemaBuilderStore.getState().isDirty).toBe(false);
        expect(useSchemaBuilderStore.getState().error).toBeNull();
        expect(useSchemaBuilderStore.getState().isLoading).toBe(false);
    });
});
