import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../stores/useProfileStore';
import { Plus, User, Trash2, X, AlertOctagon, Moon, Sun } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export const ProfileSelector: React.FC = () => {
    const { profiles, isLoading, fetchProfiles, setActiveProfile, deleteProfile } = useProfileStore();
    const { theme, toggleTheme } = useUIStore();
    const navigate = useNavigate();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');

    const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleSelectProfile = (id: string) => {
        setActiveProfile(id);
        navigate(`/app/${id}`);
    };

    const handleOpenCreate = () => {
        setCreateName('');
        setCreateDesc('');
        setIsCreateDialogOpen(true);
    };

    const handleConfirmCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) return;
        try {
            const newProfileId = await useProfileStore.getState().createProfile(createName.trim(), createDesc.trim());
            setIsCreateDialogOpen(false);
            // Auto-select the newly created profile - fixed stale closure by using direct navigation
            setActiveProfile(newProfileId);
            navigate(`/app/${newProfileId}`);
        } catch (err) {
            // Error already handled by store
        }
    };

    const handleOpenDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteProfileId(id);
    };

    const handleConfirmDelete = async () => {
        if (deleteProfileId) {
            setIsDeleting(true);
            try {
                await deleteProfile(deleteProfileId);
                setDeleteProfileId(null);
            } catch (err) {
                // Error already handled by store
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const profileToDelete = profiles.find(p => p.id === deleteProfileId);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-8 relative transition-colors duration-300">
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="absolute top-8 right-8 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 shadow-sm"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="max-w-4xl w-full text-center mb-12 mt-12 md:mt-0">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    Select Profile
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">Choose a workspace to continue</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
                {profiles.map((profile) => (
                    <div
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile.id)}
                        className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:dark:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 dark:hover:shadow-2xl dark:hover:shadow-emerald-500/10"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300">
                                <User size={24} />
                            </div>
                            <button
                                onClick={(e) => handleOpenDelete(e, profile.id)}
                                className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                                title="Delete Profile"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">{profile.name}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                            {profile.description || 'No description provided'}
                        </p>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">
                            Created: {new Date(profile.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleOpenCreate}
                    className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 hover:dark:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 group"
                >
                    <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300 mb-4">
                        <Plus size={24} />
                    </div>
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">New Profile</span>
                </button>
            </div>

            {isLoading && (
                <div className="mt-8 text-emerald-400 animate-pulse">
                    Loading profiles...
                </div>
            )}

            {/* Create Profile Dialog */}
            {isCreateDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleConfirmCreate}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create Profile</h2>
                            <button
                                type="button"
                                onClick={() => setIsCreateDialogOpen(false)}
                                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    placeholder="e.g. Personal Ledger"
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={createDesc}
                                    onChange={(e) => setCreateDesc(e.target.value)}
                                    placeholder="Brief description of this workspace"
                                    rows={3}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsCreateDialogOpen(false)}
                                className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!createName.trim()}
                                className="px-4 py-2 rounded-lg font-medium bg-emerald-500 text-white dark:text-zinc-950 hover:bg-emerald-600 dark:hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-emerald-500/50"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Profile Dialog */}
            {deleteProfileId && profileToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 shrink-0">
                                <AlertOctagon size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Profile "{profileToDelete.name}"?</h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                                    <span className="font-semibold text-red-600 dark:text-red-400">This will permanently delete all local data for this profile.</span> This operation cannot be undone.
                                </p>
                                {/* Sync Warning - Always shown since sync is planned for Epic 5 */}
                                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                                    <p className="text-amber-700 dark:text-amber-500 text-sm font-medium">
                                        Note: When sync is enabled (Epic 5), remote data must be purged separately.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteProfileId(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg font-medium bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDeleting && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                Permanently Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
