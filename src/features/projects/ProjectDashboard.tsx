import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/useProjectStore';
import { Plus, Folder, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Skeleton } from '../../components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../../components/ui/form';

export const ProjectDashboard: React.FC = () => {
    const { profileId } = useParams<{ profileId: string }>();
    const navigate = useNavigate();
    const { projects, fetchProjects, createProject, deleteProject, isLoading, setActiveProject } = useProjectStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectDesc, setNewProjectDesc] = useState('');

    const form = useForm<{ name: string; description: string }>({
        defaultValues: {
            name: '',
            description: '',
        },
    });

    useEffect(() => {
        if (profileId) {
            fetchProjects(profileId);
        }
    }, [profileId, fetchProjects]);

    const handleCreateProject = async (data: { name: string; description: string }) => {
        if (profileId && data.name) {
            await createProject(profileId, data.name, data.description);
            form.reset();
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
        setActiveProject(projectId);
        navigate(`/app/${profileId}/project/${projectId}`);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Select a project to start tracking or build your ecosystem.</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-900/20"
                >
                    <Plus size={20} />
                    New Project
                </Button>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 p-8">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <Skeleton className="flex flex-col items-center gap-4 w-48 h-24">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <p>Loading projects...</p>
                        </Skeleton>
                    </div>
                ) : projects.length === 0 ? (
                    <Card className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed m-4 p-8">
                        <CardContent className="flex flex-col items-center">
                            <div className="p-4 bg-emerald-500/10 rounded-full mb-6">
                                <Folder size={48} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Welcome to Ledgy!</h2>
                            <p className="max-w-md text-center text-zinc-500 dark:text-zinc-400 mb-8">
                                Create your first project to organize your tracking ledgers and build your data automation ecosystem. Projects are secure, local containers for all your ledgers.
                            </p>
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Get Started
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project) => (
                            <Card
                                key={project._id}
                                onClick={() => handleProjectClick(project._id)}
                                className="group relative flex flex-col p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer shadow-sm hover:shadow-emerald-900/10"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                        <Folder size={24} />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleDeleteProject(e, project._id)}
                                        className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                                        title="Delete Project"
                                        aria-label="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">
                                    Project
                                </h3>
                                <h2 className="text-xl font-bold mb-2 truncate text-zinc-900 dark:text-zinc-100">
                                    {project.name}
                                </h2>
                                {project.description && (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6">
                                        {project.description}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center gap-2 text-emerald-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Project <ArrowRight size={14} />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md shadow-2xl">
                        <CardHeader>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">New Project</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Define a new container for your tracking ecosystems.</p>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        rules={{ required: 'Project name is required' }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="project-name" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Project Name</Label>
                                                <FormControl>
                                                    <Input
                                                        id="project-name"
                                                        autoFocus
                                                        type="text"
                                                        placeholder="e.g. Personal Health, My Business"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="project-desc" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description (Optional)</Label>
                                                <FormControl>
                                                    <Textarea
                                                        id="project-desc"
                                                        placeholder="What are you tracking in this project?"
                                                        className="h-24 resize-none"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                                        >
                                            Create Project
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
