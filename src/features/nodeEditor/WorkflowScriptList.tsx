import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../../stores/useWorkflowStore';
import { Plus, GitBranch, Trash2, ArrowRight, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Skeleton } from '../../components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../../components/ui/form';
import { WorkflowScript } from '../../types/nodeEditor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CreateWorkflowModalProps {
    onClose: () => void;
    onSubmit: (name: string, description?: string) => Promise<void>;
}

const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({ onClose, onSubmit }) => {
    const form = useForm<{ name: string; description: string }>({
        defaultValues: { name: '', description: '' },
    });

    const handleSubmit = async (data: { name: string; description: string }) => {
        await onSubmit(data.name, data.description || undefined);
        form.reset();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">New Workflow</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Create a named Node Forge workflow for this project.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <Form {...form}>
                            <FormField
                                control={form.control}
                                name="name"
                                rules={{ required: 'Workflow name is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="workflow-name" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Workflow Name</Label>
                                        <FormControl>
                                            <Input
                                                id="workflow-name"
                                                autoFocus
                                                type="text"
                                                placeholder="e.g. Revenue Tracker, Monthly Budget"
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
                                        <Label htmlFor="workflow-desc" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description (Optional)</Label>
                                        <FormControl>
                                            <Input
                                                id="workflow-desc"
                                                type="text"
                                                placeholder="One-line description"
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold">
                                    Create Workflow
                                </Button>
                            </div>
                        </Form>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

interface RenameWorkflowModalProps {
    workflow: WorkflowScript;
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

const RenameWorkflowModal: React.FC<RenameWorkflowModalProps> = ({ workflow, onClose, onSubmit }) => {
    const form = useForm<{ name: string }>({
        defaultValues: { name: workflow.name },
    });

    const handleSubmit = async (data: { name: string }) => {
        await onSubmit(data.name);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Rename Workflow</h2>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <Form {...form}>
                            <FormField
                                control={form.control}
                                name="name"
                                rules={{ required: 'Workflow name is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="rename-name" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">New Name</Label>
                                        <FormControl>
                                            <Input
                                                id="rename-name"
                                                autoFocus
                                                type="text"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold">
                                    Rename
                                </Button>
                            </div>
                        </Form>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const WorkflowScriptList: React.FC = () => {
    const { profileId, projectId } = useParams<{ profileId: string; projectId: string }>();
    const navigate = useNavigate();
    const { workflows, fetchWorkflows, createWorkflow, renameWorkflow, deleteWorkflow, isLoading } = useWorkflowStore();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [renamingWorkflow, setRenamingWorkflow] = useState<WorkflowScript | null>(null);

    useEffect(() => {
        if (profileId && projectId) {
            fetchWorkflows(profileId, projectId);
        }
    }, [profileId, projectId, fetchWorkflows]);

    const handleCreate = async (name: string, description?: string) => {
        if (profileId && projectId) {
            await createWorkflow(profileId, projectId, name, description);
        }
    };

    const handleRename = async (name: string) => {
        if (profileId && renamingWorkflow) {
            await renameWorkflow(profileId, renamingWorkflow._id, name);
        }
    };

    const handleDelete = (e: React.MouseEvent, workflow: WorkflowScript) => {
        e.stopPropagation();
        if (profileId && window.confirm(`Delete workflow '${workflow.name}'? This cannot be undone.`)) {
            deleteWorkflow(profileId, workflow._id);
        }
    };

    const handleRenameClick = (e: React.MouseEvent, workflow: WorkflowScript) => {
        e.stopPropagation();
        setRenamingWorkflow(workflow);
    };

    const handleCardClick = (workflowId: string) => {
        navigate(`/app/${profileId}/project/${projectId}/node-forge/${workflowId}`);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Node Forge</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Manage your workflow scripts and open one for canvas editing.</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-900/20"
                >
                    <Plus size={20} />
                    New Workflow
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-40 rounded-xl" />
                        ))}
                    </div>
                ) : workflows.length === 0 ? (
                    <Card className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed m-4 p-8">
                        <CardContent className="flex flex-col items-center">
                            <div className="p-4 bg-emerald-500/10 rounded-full mb-6">
                                <GitBranch size={48} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">No workflows yet</h2>
                            <p className="max-w-md text-center text-zinc-500 dark:text-zinc-400 mb-8">
                                Create your first workflow to start building your Node Forge automation canvas.
                            </p>
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Create your first workflow
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {workflows.map((workflow) => (
                            <Card
                                key={workflow._id}
                                onClick={() => handleCardClick(workflow._id)}
                                className="group relative flex flex-col p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer shadow-sm hover:shadow-emerald-900/10"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                        <GitBranch size={24} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleRenameClick(e, workflow)}
                                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                            title="Rename Workflow"
                                            aria-label="Rename Workflow"
                                        >
                                            <Pencil size={15} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleDelete(e, workflow)}
                                            className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10"
                                            title="Delete Workflow"
                                            aria-label="Delete Workflow"
                                        >
                                            <Trash2 size={15} />
                                        </Button>
                                    </div>
                                </div>
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">
                                    Workflow
                                </h3>
                                <h2 className="text-xl font-bold mb-2 truncate text-zinc-900 dark:text-zinc-100">
                                    {workflow.name}
                                </h2>
                                {workflow.description && (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-2">
                                        {workflow.description}
                                    </p>
                                )}
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                                    {formatDate(workflow.updatedAt)}
                                </p>
                                <div className="mt-auto flex items-center gap-2 text-emerald-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Canvas <ArrowRight size={14} />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Modals */}
            {isCreateModalOpen && (
                <CreateWorkflowModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreate}
                />
            )}
            {renamingWorkflow && (
                <RenameWorkflowModal
                    workflow={renamingWorkflow}
                    onClose={() => setRenamingWorkflow(null)}
                    onSubmit={handleRename}
                />
            )}
        </div>
    );
};
