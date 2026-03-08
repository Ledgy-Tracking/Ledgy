import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { ProjectDocument } from '../types/project';
import { list_projects, create_project, delete_project } from '../lib/db';

interface ProjectState {
    projects: ProjectDocument[];
    activeProjectId: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchProjects: (profileId: string) => Promise<void>;
    createProject: (profileId: string, name: string, description?: string) => Promise<void>;
    deleteProject: (profileId: string, projectId: string) => Promise<void>;
    setActiveProject: (projectId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProjectId: null,
    isLoading: false,
    error: null,

    fetchProjects: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
            const db = getProfileDb(profileId);
            const projects = await list_projects(db);
            set({ projects, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    createProject: async (profileId: string, name: string, description?: string) => {
        set({ isLoading: true, error: null });
        try {
            const db = getProfileDb(profileId);
            const projectId = await create_project(db, name, description, profileId);
            const projects = await list_projects(db);
            set({ projects, isLoading: false, activeProjectId: projectId });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    deleteProject: async (profileId: string, projectId: string) => {
        set({ isLoading: true, error: null });
        try {
            const db = getProfileDb(profileId);
            await delete_project(db, projectId);
            const projects = await list_projects(db);
            set({
                projects,
                isLoading: false,
                activeProjectId: get().activeProjectId === projectId ? null : get().activeProjectId
            });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    setActiveProject: (projectId: string | null) => {
        set({ activeProjectId: projectId });
    },
}));
