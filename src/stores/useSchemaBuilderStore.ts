import { create } from 'zustand';
import { SchemaField, LedgerSchema } from '../types/ledger';
import { useErrorStore } from './useErrorStore';
import { useLedgerStore } from './useLedgerStore';

export interface SchemaBuilderState {
    // Draft being actively edited
    draftName: string;
    draftFields: SchemaField[];
    // Mode management
    mode: 'create' | 'edit';
    editingSchemaId: string | null;
    projectId: string;
    // Status flags
    isDirty: boolean;
    isLoading: boolean;
    error: string | null;
    // Actions
    initCreate: (projectId: string) => void;
    initEdit: (schema: LedgerSchema) => void;
    setDraftName: (name: string) => void;
    addField: () => void;
    removeField: (index: number) => void;
    updateField: (index: number, patch: Partial<SchemaField>) => void;
    reorderField: (fromIndex: number, toIndex: number) => void;
    commit: (profileId: string) => Promise<void>;
    discard: () => void;
}

const initialState = {
    draftName: '',
    draftFields: [] as SchemaField[],
    mode: 'create' as const,
    editingSchemaId: null,
    projectId: '',
    isDirty: false,
    isLoading: false,
    error: null,
};

export const useSchemaBuilderStore = create<SchemaBuilderState>((set, get) => ({
    ...initialState,

    initCreate: (projectId: string) => {
        set({
            ...initialState,
            projectId,
            mode: 'create',
            editingSchemaId: null,
        });
    },

    initEdit: (schema: LedgerSchema) => {
        set({
            draftName: schema.name,
            draftFields: schema.fields.map(f => {
                const field = { ...f };
                // Clear any self-referencing relation targets (corruption guard)
                if (field.type === 'relation' && field.relationTarget === schema._id) {
                    delete field.relationTarget;
                }
                return field;
            }),
            mode: 'edit',
            editingSchemaId: schema._id,
            projectId: schema.projectId,
            isDirty: false,
            isLoading: false,
            error: null,
        });
    },

    setDraftName: (name: string) => {
        set({ draftName: name, isDirty: true });
    },

    addField: () => {
        const { draftFields } = get();
        set({
            draftFields: [...draftFields, { name: '', type: 'text', required: false }],
            isDirty: true,
        });
    },

    removeField: (index: number) => {
        const { draftFields } = get();
        if (index < 0 || index >= draftFields.length) return;
        set({ draftFields: draftFields.filter((_, i) => i !== index), isDirty: true });
    },

    updateField: (index: number, patch: Partial<SchemaField>) => {
        const { draftFields } = get();
        if (index < 0 || index >= draftFields.length) return;
        const updated = { ...draftFields[index], ...patch };
        if (updated.type !== 'relation') {
            delete updated.relationTarget;
        }
        if (updated.type !== 'text' && updated.type !== 'long_text') {
            delete updated.minLength;
            delete updated.maxLength;
            delete updated.pattern;
        }
        if (updated.type !== 'number') {
            delete updated.min;
            delete updated.max;
        }
        if (updated.type !== 'date') {
            delete updated.dateMin;
            delete updated.dateMax;
            delete updated.dateFormat;
        }
        const newFields = [...draftFields];
        newFields[index] = updated;
        set({ draftFields: newFields, isDirty: true });
    },

    reorderField: (fromIndex: number, toIndex: number) => {
        const { draftFields } = get();
        if (
            fromIndex < 0 || fromIndex >= draftFields.length ||
            toIndex < 0 || toIndex >= draftFields.length
        ) return;
        const newFields = [...draftFields];
        const [removed] = newFields.splice(fromIndex, 1);
        newFields.splice(toIndex, 0, removed);
        set({ draftFields: newFields, isDirty: true });
    },

    commit: async (profileId: string) => {
        const { draftName, draftFields, mode, editingSchemaId, projectId } = get();

        if (draftName.trim() === '') {
            const msg = 'Schema name is required';
            useErrorStore.getState().dispatchError(msg);
            set({ error: msg });
            return;
        }

        if (draftFields.length === 0) {
            const msg = 'At least one field is required';
            useErrorStore.getState().dispatchError(msg);
            set({ error: msg });
            return;
        }

        for (const field of draftFields) {
            if (field.type === 'relation') {
                if (!field.relationTarget) {
                    const msg = `Relation target required for field "${field.name || 'unnamed'}"`;
                    useErrorStore.getState().dispatchError(msg);
                    set({ error: msg });
                    return;
                } else if (mode === 'edit' && field.relationTarget === editingSchemaId) {
                    const msg = `Relation field "${field.name || 'unnamed'}" cannot target its own schema`;
                    useErrorStore.getState().dispatchError(msg);
                    set({ error: msg });
                    return;
                } else {
                    const schemas = useLedgerStore.getState().schemas;
                    const targetExists = schemas.some(s => s._id === field.relationTarget);
                    if (!targetExists) {
                        const msg = `Relation target for field "${field.name}" no longer exists`;
                        useErrorStore.getState().dispatchError(msg);
                        set({ error: msg });
                        return;
                    }
                }
            }
        }

        set({ isLoading: true });
        try {
            if (mode === 'create') {
                await useLedgerStore.getState().createSchema(profileId, projectId, draftName.trim(), draftFields);
            } else {
                if (!editingSchemaId) throw new Error('No schema ID for edit');
                await useLedgerStore.getState().updateSchema(editingSchemaId, draftName.trim(), draftFields);
            }
            set({ isLoading: false, isDirty: false, error: null });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save schema';
            set({ isLoading: false, error: errorMsg });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    discard: () => {
        set({ ...initialState });
    },
}));
