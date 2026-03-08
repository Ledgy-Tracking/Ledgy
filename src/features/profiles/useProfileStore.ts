import { create } from 'zustand';

export interface Profile {
    id: string;
    name: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
}

interface ProfileState {
    // State fields
    profiles: Profile[];
    activeProfileId: string | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    loadProfiles: () => Promise<void>;
    setActiveProfile: (profileId: string) => void;
    clearActiveProfile: () => void;
    createProfile: (name: string, icon?: string) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    // Initial state
    profiles: [],
    activeProfileId: null,
    isLoading: false,
    error: null,

    loadProfiles: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, load from localStorage as placeholder
            const stored = localStorage.getItem('ledgy-profiles');
            const profiles: Profile[] = stored ? JSON.parse(stored) : [];
            set({ profiles, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load profiles';
            set({ error: errorMessage, isLoading: false });
            // Dispatch to global error store
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    setActiveProfile: (profileId: string) => {
        set({ activeProfileId: profileId });
    },

    clearActiveProfile: () => {
        set({ activeProfileId: null });
    },

    createProfile: async (name: string, icon?: string) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const newProfile: Profile = {
                id: `profile:${Date.now()}`,
                name,
                icon,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            const updatedProfiles = [...get().profiles, newProfile];
            localStorage.setItem('ledgy-profiles', JSON.stringify(updatedProfiles));
            set({ profiles: updatedProfiles, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    deleteProfile: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const updatedProfiles = get().profiles.filter(p => p.id !== profileId);
            localStorage.setItem('ledgy-profiles', JSON.stringify(updatedProfiles));
            set({ profiles: updatedProfiles, isLoading: false });
            
            // Clear active profile if deleted
            if (get().activeProfileId === profileId) {
                set({ activeProfileId: null });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete profile';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },
}));
