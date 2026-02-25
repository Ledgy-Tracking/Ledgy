import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/useProjectStore';
import { Plus, Folder, Trash2, ArrowRight } from 'lucide-react';

export const ProjectDashboard: React.FC = () => {
    const { profileId } = useParams<{ profileId: string }>();
    const navigate = useNavigate();
    const { projects, fetchProjects, createProject, deleteProject, isLoading } = useProjectStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');

    useEffect(() => {
        if (profileId) {
            fetchProjects(profileId);
        }
    }, [profileId, fetchProjects]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (profileId && newProjectName) {
            await createProject(profileId, newProjectName, newProjectDesc);
            setNewProjectName('');
            setNewProjectDesc('');
            setIsCreateModalOpen(false);
        }
    };

    const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (profileId && window.confirm('Are you sure you want to delete this project? All associated ledgers will remain in the database but will be unlinked.')) {
            deleteProject(profileId, projectId);
        }
    };

    const handleProjectClick = (projectId: string) => {
        navigate(`/app/${profileId}/project/${projectId}`);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800 bg-zinc-900/50">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-zinc-400 text-sm mt-1">Select a project to start tracking or build your ecosystem.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-md font-bold transition-all shadow-lg shadow-emerald-900/20"
                >
                    <Plus size={20} />
                    New Project
                </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-8">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-zinc-500">
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800" />
                            <p>Loading projects...</p>
                        </div>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl m-4">
                        <Folder size={48} className="mb-4 text-zinc-700" />
                        <h2 className="text-xl font-medium text-zinc-300">No projects yet</h2>
                        <p className="max-w-xs text-center mt-2 mb-6">Create your first project to organize your tracking ledgers and node automations.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-md font-bold transition-all shadow-lg shadow-emerald-900/20"
                        >
                            Get Started
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project._id}
                                onClick={() => handleProjectClick(project._id)}
                                className="group relative flex flex-col p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-all cursor-pointer shadow-sm hover:shadow-emerald-900/10"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 bg-zinc-800 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                                        <Folder size={24} />
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteProject(e, project._id)}
                                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h3 className="text-lg font-semibold mb-1 group-hover:text-emerald-400 transition-colors uppercase tracking-wider text-xs font-bold text-zinc-500">
                                    Project
                                </h3>
                                <h2 className="text-xl font-bold mb-2 truncate">
                                    {project.name}
                                </h2>
                                {project.description && (
                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-6">
                                        {project.description}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center gap-2 text-emerald-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Project <ArrowRight size={14} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-xl font-bold">New Project</h2>
                            <p className="text-sm text-zinc-400 mt-1">Define a new container for your tracking ecosystems.</p>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Project Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="e.g. Personal Health, My Business"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-24 resize-none"
                                    placeholder="What are you tracking in this project?"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProjectName}
                                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-zinc-950 rounded-md font-bold transition-colors"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
