import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, RefreshCw, Shield, Globe, User, Key, ArrowRightLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { useSyncStore } from '../../stores/useSyncStore';

interface SyncConfigDialogProps {
    profileId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface SyncFormValues {
    remoteUrl: string;
    username: string;
    password: string;
    syncDirection: 'upload' | 'two-way';
    continuous: boolean;
}

export const SyncConfigDialog: React.FC<SyncConfigDialogProps> = ({ profileId, isOpen, onClose }) => {
    const { syncConfig, isLoading, loadSyncConfig, saveSyncConfig } = useSyncStore();

    const form = useForm<SyncFormValues>({
        defaultValues: {
            remoteUrl: '',
            username: '',
            password: '',
            syncDirection: 'two-way',
            continuous: true
        }
    });

    const { setValue, watch } = form;
    const syncDirection = watch('syncDirection');
    const continuous = watch('continuous');

    useEffect(() => {
        if (isOpen) {
            loadSyncConfig(profileId);
        }
    }, [isOpen, profileId, loadSyncConfig]);

    useEffect(() => {
        if (syncConfig) {
            setValue('remoteUrl', syncConfig.remoteUrl || '');
            setValue('username', syncConfig.username || '');
            setValue('password', syncConfig.password || '');
            setValue('syncDirection', syncConfig.syncDirection || 'two-way');
            setValue('continuous', syncConfig.continuous !== undefined ? syncConfig.continuous : true);
        }
    }, [syncConfig, setValue]);

    const onSubmit = async (data: SyncFormValues) => {
        await saveSyncConfig(profileId, {
            remoteUrl: data.remoteUrl,
            username: data.username,
            password: data.password,
            syncDirection: data.syncDirection,
            continuous: data.continuous
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Card className="p-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg">
                            <RefreshCw size={24} />
                        </Card>
                        Sync Configuration
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            onClick={onClose}
                            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 ml-auto"
                            aria-label="Close Sync Configuration"
                        >
                            <X size={20} />
                        </Button>
                    </DialogTitle>
                    <DialogDescription>
                        Configure your remote sync settings
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Form {...form}>
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <Shield className="text-amber-600 dark:text-amber-500 shrink-0" size={20} />
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                            Credentials are encrypted with your profile key before being stored locally.
                            Only you can access the sync endpoint.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="remoteUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Globe size={14} /> CouchDB Remote URL
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="url"
                                            required
                                            autoComplete="off"
                                            placeholder="https://your-couchdb-instance.com/db-name"
                                            {...field}
                                            className="bg-background border-border text-foreground focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <User size={14} /> Username
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                autoComplete="off"
                                                placeholder="Admin"
                                                {...field}
                                                className="bg-background border-border text-foreground focus:border-emerald-500 focus:ring-emerald-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Key size={14} /> Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                autoComplete="off"
                                                placeholder="••••••••"
                                                {...field}
                                                className="bg-background border-border text-foreground focus:border-emerald-500 focus:ring-emerald-500"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="block text-sm font-medium text-muted-foreground mb-1.5">Sync Direction</Label>
                                <div className="flex bg-muted p-1 rounded-lg">
                                    <Button
                                        type="button"
                                        onClick={() => form.setValue('syncDirection', 'two-way')}
                                        variant="ghost"
                                        size="sm"
                                        className={`flex-1 text-xs ${syncDirection === 'two-way'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <ArrowRightLeft size={14} /> Two-way
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => form.setValue('syncDirection', 'upload')}
                                        variant="ghost"
                                        size="sm"
                                        className={`flex-1 text-xs ${syncDirection === 'upload'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <Upload size={14} /> Upload only
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end">
                                <div className="flex items-center justify-between p-2.5">
                                    <Label htmlFor="continuous-sync" className="text-sm font-medium text-muted-foreground cursor-pointer">
                                        Continuous Sync
                                    </Label>
                                    <Switch
                                        id="continuous-sync"
                                        checked={continuous}
                                        onCheckedChange={(checked) => form.setValue('continuous', checked)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!form.watch('remoteUrl') || isLoading}
                            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Configuration
                        </Button>
                    </div>
                    </Form>
                </form>
            </DialogContent>
        </Dialog>
    );
};
