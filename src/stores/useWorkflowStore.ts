import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { WorkflowScript } from '../types/nodeEditor';
import { getProfileDb, create_workflow, list_workflows, rename_workflow, delete_workflow } from '../lib/db';
import { useErrorStore } from './useErrorStore';

interface WorkflowState {
    workflows: WorkflowScript[];
    isLoading: boolean;
    error: string | null;
    activeProfileId: string | null;
    activeProjectId: string | null;

    fetchWorkflows: (profileId: string, projectId: string) => Promise<void>;
    createWorkflow: (profileId: string, projectId: string, name: string, description?: string) => Promise<void>;
    renameWorkflow: (profileId: string, workflowDocId: string, name: string) => Promise<void>;
    deleteWorkflow: (profileId: string, workflowDocId: string) => Promise<void>;
    clearProfileData: () => void;
}

const initialState = {
    workflows: [],
    isLoading: false,
    error: null,
    activeProfileId: null,
    activeProjectId: null,
};

export const useWorkflowStore = create<WorkflowState>()(
    subscribeWithSelector((set) => ({
        ...initialState,

        fetchWorkflows: async (profileId: string, projectId: string) => {
            set({ isLoading: true, error: null, activeProfileId: profileId, activeProjectId: projectId });
            try {
                const db = getProfileDb(profileId);
                const workflows = await list_workflows(db, projectId);
                set({ workflows, isLoading: false });
            } catch (err: any) {
                const msg = err.message || 'Failed to fetch workflows';
                set({ error: msg, isLoading: false });
                useErrorStore.getState().dispatchError(msg);
            }
        },

        createWorkflow: async (profileId: string, projectId: string, name: string, description?: string) => {
            try {
                const db = getProfileDb(profileId);
                const newWorkflow = await create_workflow(db, profileId, projectId, name, description);
                set(state => ({ workflows: [newWorkflow, ...state.workflows] }));
            } catch (err: any) {
                const msg = err.message || 'Failed to create workflow';
                useErrorStore.getState().dispatchError(msg);
                throw err;
            }
        },

        renameWorkflow: async (profileId: string, workflowDocId: string, name: string) => {
            try {
                const db = getProfileDb(profileId);
                await rename_workflow(db, workflowDocId, name);
                set(state => ({
                    workflows: state.workflows.map(w =>
                        w._id === workflowDocId
                            ? { ...w, name, updatedAt: new Date().toISOString() }
                            : w
                    ),
                }));
            } catch (err: any) {
                const msg = err.message || 'Failed to rename workflow';
                useErrorStore.getState().dispatchError(msg);
                throw err;
            }
        },

        deleteWorkflow: async (profileId: string, workflowDocId: string) => {
            try {
                const db = getProfileDb(profileId);
                await delete_workflow(db, workflowDocId);
                set(state => ({
                    workflows: state.workflows.filter(w => w._id !== workflowDocId),
                }));
            } catch (err: any) {
                const msg = err.message || 'Failed to delete workflow';
                useErrorStore.getState().dispatchError(msg);
                throw err;
            }
        },

        clearProfileData: () => {
            set(initialState);
        },
    }))
);
