import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../stores/useProfileStore';
import { Plus, User, Trash2, AlertTriangle, Moon, Sun } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { WelcomePage } from './WelcomePage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { Label } from '../../components/ui/label';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

interface CreateProfileForm {
    name: string;
    description: string;
}

interface RenameProfileForm {
    name: string;
}

export const ProfileSelector: React.FC = () => {
    const { profiles, isLoading, fetchProfiles, setActiveProfile, deleteProfile } = useProfileStore();
    const { theme, toggleTheme } = useUIStore();
    const navigate = useNavigate();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeletingForceLocal, setIsDeletingForceLocal] = useState(false);
    const [purgeRemote, setPurgeRemote] = useState(true);
    const [showForceLocal, setShowForceLocal] = useState(false);

    const createForm = useForm<CreateProfileForm>({
        defaultValues: {
            name: '',
            description: ''
        }
    });

    const renameForm = useForm<RenameProfileForm>({
        defaultValues: {
            name: ''
        }
    });

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleSelectProfile = (id: string) => {
        setActiveProfile(id);
        navigate(`/app/${id}`);
    };

    const handleOpenCreate = () => {
        createForm.reset({ name: '', description: '' });
        setIsCreateDialogOpen(true);
    };

    const handleConfirmCreate = async (data: CreateProfileForm) => {
        if (!data.name.trim()) return;
        setIsCreating(true);
        try {
            const newProfileId = await useProfileStore.getState().createProfile(data.name.trim(), data.description.trim());
            setIsCreateDialogOpen(false);
            // Auto-select the newly created profile - fixed stale closure by using direct navigation
            setActiveProfile(newProfileId);
            navigate(`/app/${newProfileId}`);
        } catch (err) {
            // Error already handled by store
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteProfileId(id);
        setPurgeRemote(true);
        setShowForceLocal(false);
        renameForm.reset({ name: '' });
    };

    const handleCancelDelete = () => {
        setDeleteProfileId(null);
        setShowForceLocal(false);
        setPurgeRemote(true);
        setIsDeletingForceLocal(false);
        renameForm.reset({ name: '' });
    };

    const handleConfirmDelete = async (forceLocal: boolean = false) => {
        if (deleteProfileId) {
            setIsDeletingForceLocal(forceLocal);
            setIsDeleting(true);
            try {
                const result = await deleteProfile(deleteProfileId, forceLocal);
                if (result.success) {
                    setDeleteProfileId(null);
                    setShowForceLocal(false);
                    setPurgeRemote(true);
                    renameForm.reset({ name: '' });
                } else if (result.error?.includes('NETWORK_UNREACHABLE')) {
                    setShowForceLocal(true);
                }
            } catch (err) {
                // Error already handled by store
            } finally {
                setIsDeleting(false);
                setIsDeletingForceLocal(false);
            }
        }
    };

    const profileToDelete = profiles.find(p => p.id === deleteProfileId);
    const deleteConfirmNameValue = renameForm.watch('name');
    const isDeleteConfirmed = deleteConfirmNameValue === profileToDelete?.name;

    // AC #1: Show WelcomePage when loading is done and 0 profiles exist
    if (!isLoading && profiles.length === 0) {
        return <WelcomePage />;
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-8 relative transition-colors duration-300">
            {/* Theme Toggle Button */}
            <Button
                onClick={toggleTheme}
                variant="outline"
                size="icon"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="absolute top-8 right-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/50 focus:ring-emerald-500/50"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            <div className="max-w-4xl w-full text-center mb-12 mt-12 md:mt-0">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    Select Profile
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">Choose a workspace to continue</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
                {profiles.map((profile) => (
                    <div key={profile.id} className="relative group">
                        {/* Card button — full clickable area, keyboard accessible */}
                        <Button
                            onClick={() => handleSelectProfile(profile.id)}
                            variant="outline"
                            aria-label={`Select profile ${profile.name}`}
                            className="justify-start text-left w-full h-auto bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:dark:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 dark:hover:shadow-2xl dark:hover:shadow-emerald-500/10 focus:ring-emerald-500/50"
                        >
                            <div className="flex items-start mb-4">
                                <Card className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300">
                                    <User size={24} />
                                </Card>
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">{profile.name}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                                {profile.description || 'No description provided'}
                            </p>
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                Created: {new Date(profile.createdAt).toLocaleDateString()}
                            </div>
                        </Button>
                        {/* Delete button — sibling to card button, absolutely positioned in top-right */}
                        <Button
                            onClick={(e) => handleOpenDelete(e, profile.id)}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete profile ${profile.name}`}
                            className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 focus:ring-red-500/50"
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                ))}

                <Button
                    onClick={handleOpenCreate}
                    variant="outline"
                    className="h-auto flex-col bg-zinc-50 dark:bg-zinc-900/30 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500 hover:dark:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 group"
                >
                    <Card className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300 mb-4">
                        <Plus size={24} />
                    </Card>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">New Profile</span>
                </Button>
            </div>

            {isLoading && (
                <Skeleton className="mt-8 text-emerald-400">
                    Loading profiles...
                </Skeleton>
            )}

            {/* Create Profile Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && setIsCreateDialogOpen(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Profile</DialogTitle>
                        <DialogDescription>
                            Create a new profile to organize your data
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(handleConfirmCreate)}>
                            <div className="space-y-4 mb-6">
                                <FormField
                                    control={createForm.control}
                                    name="name"
                                    rules={{ required: 'Name is required' }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="create-name" className="text-sm font-medium text-muted-foreground">Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="create-name"
                                                    type="text"
                                                    {...field}
                                                    placeholder="e.g. Personal Ledger"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="create-desc" className="text-sm font-medium text-muted-foreground">Description (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    id="create-desc"
                                                    {...field}
                                                    placeholder="Brief description of this workspace"
                                                    rows={3}
                                                    className="resize-none"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!createForm.formState.isValid || isCreating}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                                >
                                    {isCreating && (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    )}
                                    Create
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Profile Dialog */}
            <Dialog 
                open={!!deleteProfileId && !!profileToDelete} 
                onOpenChange={(open) => !open && !isDeleting && handleCancelDelete()}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-start gap-3">
                            <Card className="p-2 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 shrink-0 border-none shadow-none">
                                <AlertTriangle size={20} />
                            </Card>
                            <span>Delete Profile "{profileToDelete?.name}"?</span>
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            <span className="font-semibold text-red-600 dark:text-red-400">This action is permanent and irreversible.</span>
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...renameForm}>
                        <form onSubmit={renameForm.handleSubmit(() => {
                            if (isDeleteConfirmed && !isDeleting) handleConfirmDelete(false);
                        })}>
                            <div className="space-y-4 mb-6">
                                {profileToDelete?.remoteSyncEndpoint ? (
                                    <div className="space-y-4">
                                        <Card className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                                            <p className="text-amber-700 dark:text-amber-500 text-sm font-medium mb-2">
                                                This profile is synced to a remote server. <span className="font-semibold">This action is permanent and irreversible.</span>
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="purge-remote"
                                                    checked={purgeRemote}
                                                    onCheckedChange={(checked) => setPurgeRemote(checked === true)}
                                                />
                                                <Label htmlFor="purge-remote" className="text-sm text-amber-800 dark:text-amber-400 cursor-pointer">
                                                    Also delete data from remote server (Right to be Forgotten)
                                                </Label>
                                            </div>
                                        </Card>

                                        {showForceLocal && (
                                            <Alert role="alert" className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
                                                <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                                                    Remote server is unreachable. You can continue with a local-only deletion if you wish.
                                                </p>
                                            </Alert>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        This operation cannot be undone.
                                    </p>
                                )}

                                <FormField
                                    control={renameForm.control}
                                    name="name"
                                    rules={{
                                        required: 'Confirmation name is required',
                                        validate: (value) => value === profileToDelete?.name || 'Name does not match'
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel
                                                htmlFor="delete-confirm-input"
                                                className="text-sm font-medium text-muted-foreground"
                                            >
                                                Type <span className="font-bold text-foreground">{profileToDelete?.name}</span> to confirm
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="delete-confirm-input"
                                                    type="text"
                                                    autoFocus
                                                    {...field}
                                                    aria-label={`Type the profile name ${profileToDelete?.name} to confirm deletion`}
                                                    aria-describedby="delete-danger-description"
                                                    aria-invalid={field.value.length > 0 && field.value !== profileToDelete?.name}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            <span id="delete-danger-description" className="sr-only">
                                                This action is permanent and irreversible. Type the profile name exactly to enable the delete button.
                                            </span>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleCancelDelete}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={!isDeleteConfirmed || isDeleting}
                                    className="flex items-center gap-2"
                                >
                                    {isDeleting && !isDeletingForceLocal && (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    )}
                                    {purgeRemote && profileToDelete?.remoteSyncEndpoint ? 'Delete Local & Remote' : 'Permanently Delete'}
                                </Button>

                                {showForceLocal && (
                                    <Button
                                        type="button"
                                        onClick={() => handleConfirmDelete(true)}
                                        disabled={!isDeleteConfirmed || isDeleting}
                                        className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                                    >
                                        {isDeleting && isDeletingForceLocal && (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        )}
                                        Force Delete Locally
                                    </Button>
                                )}
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
