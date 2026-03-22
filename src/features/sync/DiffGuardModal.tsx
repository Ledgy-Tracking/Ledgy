import React, { useMemo } from 'react';
import { X, Check, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConflictEntry } from './ConflictListSheet';
import { useProfileStore } from '../../stores/useProfileStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { resolveConflict, skipConflict } from '../../services/syncService';
import { useErrorStore } from '../../stores/useErrorStore';

interface DiffGuardModalProps {
    conflict: ConflictEntry;
    isOpen: boolean;
    onAcceptLocal: () => void;
    onAcceptRemote: () => void;
    onSkip: () => void;
    onClose: () => void;
}

/**
 * Diff Guard Modal - Side-by-side comparison of conflicting versions
 * Story 5-3: Conflict Detection & Diff Guard Layout
 * Story 5-4: Conflict Resolution (Accept/Reject)
 * Theme: Uses dark:text-white conditional styling
 */
export const DiffGuardModal: React.FC<DiffGuardModalProps> = ({
    conflict,
    isOpen,
    onAcceptLocal,
    onAcceptRemote,
    onSkip,
    onClose,
}) => {
    const { activeProfileId } = useProfileStore();
    const { removeConflict } = useSyncStore();
    const { dispatchError } = useErrorStore();
    const [isResolving, setIsResolving] = React.useState(false);

    // Merge state - initialize with a basic merge (remote wins on conflict)
    const [mergedData, setMergedData] = React.useState<Record<string, any>>({
        ...(conflict.localVersion.data || {}),
        ...(conflict.remoteVersion.data || {})
    });

    const { localVersion, remoteVersion, conflictingFields } = conflict;

    const allFields = useMemo(() => {
        const fields = new Set<string>();
        Object.keys(localVersion.data || {}).forEach(f => fields.add(f));
        Object.keys(remoteVersion.data || {}).forEach(f => fields.add(f));
        return Array.from(fields);
    }, [localVersion.data, remoteVersion.data]);

    const handleAcceptLocal = async () => {
        if (!activeProfileId) return;
        setIsResolving(true);
        try {
            await resolveConflict(activeProfileId, conflict.entryId, 'local', conflict);
            removeConflict(conflict.entryId);
            onAcceptLocal();
        } catch (err: any) {
            dispatchError(err.message || 'Failed to accept local version', 'error');
        } finally {
            setIsResolving(false);
        }
    };

    const handleAcceptRemote = async () => {
        if (!activeProfileId) return;
        setIsResolving(true);
        try {
            await resolveConflict(activeProfileId, conflict.entryId, 'remote', conflict);
            removeConflict(conflict.entryId);
            onAcceptRemote();
        } catch (err: any) {
            dispatchError(err.message || 'Failed to accept remote version', 'error');
        } finally {
            setIsResolving(false);
        }
    };

    const handleAcceptMerge = async () => {
        if (!activeProfileId) return;
        setIsResolving(true);
        try {
            const { resolveConflictWithCustomData } = await import('../../services/syncService');
            await resolveConflictWithCustomData(activeProfileId, conflict.entryId, mergedData);
            removeConflict(conflict.entryId);
            onAcceptLocal(); // Close modal same as local resolution
        } catch (err: any) {
            dispatchError(err.message || 'Failed to save merged version', 'error');
        } finally {
            setIsResolving(false);
        }
    };

    const toggleFieldSource = (field: string, source: 'local' | 'remote') => {
        const value = source === 'local'
            ? localVersion.data?.[field]
            : remoteVersion.data?.[field];
        setMergedData(prev => ({ ...prev, [field]: value }));
    };

    const handleSkip = () => {
        skipConflict();
        onSkip();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" showCloseButton={false}>
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <RotateCcw size={20} className="text-amber-500" />
                                Resolve Conflict
                            </DialogTitle>
                            <DialogDescription className="font-medium">Entry: {conflict.entryName}</DialogDescription>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Close Conflict Resolution"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Diff View */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Local Version */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Local</h3>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{localVersion.deviceId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const localValue = localVersion.data?.[field];
                                    const isSelected = mergedData[field] === localValue;

                                    return (
                                        <div
                                            key={field}
                                            onClick={() => toggleFieldSource(field, 'local')}
                                            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${isDifferent
                                                    ? isSelected
                                                        ? 'border-blue-500 bg-blue-500/5'
                                                        : 'border-border bg-background hover:border-blue-500/50'
                                                    : 'border-border bg-muted/30'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase">{field}</div>
                                                {isDifferent && isSelected && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase font-bold">selected</span>
                                                )}
                                            </div>
                                            <div className={`text-sm font-medium break-all ${isDifferent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {localValue !== undefined ? String(localValue) : <span className="text-muted-foreground italic">undefined</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Remote Version */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Remote</h3>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{remoteVersion.deviceId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const remoteValue = remoteVersion.data?.[field];
                                    const isSelected = mergedData[field] === remoteValue && mergedData[field] !== localVersion.data?.[field];

                                    return (
                                        <div
                                            key={field}
                                            onClick={() => toggleFieldSource(field, 'remote')}
                                            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${isDifferent
                                                    ? isSelected
                                                        ? 'border-emerald-500 bg-emerald-500/5'
                                                        : 'border-border bg-background hover:border-emerald-500/50'
                                                    : 'border-border bg-muted/30'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase">{field}</div>
                                                {isDifferent && isSelected && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase font-bold">selected</span>
                                                )}
                                            </div>
                                            <div className={`text-sm font-medium break-all ${isDifferent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {remoteValue !== undefined ? String(remoteValue) : <span className="text-muted-foreground italic">undefined</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Merge Preview */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Merge Result</h3>
                            </div>
                            <div className="bg-background rounded-xl border border-dashed border-border p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const mergedValue = mergedData[field];
                                    const isFromLocal = mergedValue === localVersion.data?.[field];

                                    return (
                                        <div key={field} className="p-2 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase">{field}</div>
                                                {isDifferent && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${isFromLocal ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        {isFromLocal ? 'from local' : 'from remote'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium text-foreground break-all">
                                                {mergedValue !== undefined ? String(mergedValue) : <span className="text-muted-foreground italic">undefined</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between px-6 py-6 border-t border-border bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-foreground">{conflictingFields.length}</span>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Conflicts</span>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <Button
                            onClick={handleSkip}
                            disabled={isResolving}
                            variant="secondary"
                        >
                            <SkipForward size={16} />
                            Decline All
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleAcceptLocal}
                            disabled={isResolving}
                            variant="outline"
                        >
                            Accept Local
                        </Button>
                        <Button
                            onClick={handleAcceptRemote}
                            disabled={isResolving}
                            variant="outline"
                        >
                            Accept Remote
                        </Button>
                        <Button
                            onClick={handleAcceptMerge}
                            disabled={isResolving}
                            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-500/10"
                        >
                            {isResolving ? (
                                <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                                <Check size={18} />
                            )}
                            Accept Merge Result
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
