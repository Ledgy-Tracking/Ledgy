import React, { useMemo } from 'react';
import { X, Check, RotateCcw, SkipForward } from 'lucide-react';
import { ConflictEntry } from './ConflictListSheet';
import { useProfileStore } from '../../stores/useProfileStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { resolveConflict, skipConflict } from '../../services/syncService';
import { useErrorStore } from '../../stores/useErrorStore';

interface DiffGuardModalProps {
    conflict: ConflictEntry;
    onAcceptLocal: () => void;
    onAcceptRemote: () => void;
    onSkip: () => void;
    onClose: () => void;
}

/**
 * Diff Guard Modal - Side-by-side comparison of conflicting versions
 * Story 5-3: Conflict Detection & Diff Guard Layout
 * Story 5-4: Conflict Resolution (Accept/Reject)
 */
export const DiffGuardModal: React.FC<DiffGuardModalProps> = ({
    conflict,
    onAcceptLocal,
    onAcceptRemote,
    onSkip,
    onClose,
}) => {
    const { activeProfileId } = useProfileStore();
    const { removeConflict } = useSyncStore();
    const { dispatchError } = useErrorStore();
    const [isResolving, setIsResolving] = React.useState(false);

    const { localVersion, remoteVersion, conflictingFields } = conflict;

    // Get all field names from both versions
    const allFields = useMemo(() => {
        const fields = new Set<string>();
        Object.keys(localVersion.data || {}).forEach(f => fields.add(f));
        Object.keys(remoteVersion.data || {}).forEach(f => fields.add(f));
        return Array.from(fields);
    }, [localVersion.data, remoteVersion.data]);

    const handleAcceptLocal = async () => {
        if (!activeProfileId) {
            dispatchError('No active profile', 'error');
            return;
        }

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
        if (!activeProfileId) {
            dispatchError('No active profile', 'error');
            return;
        }

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

    const handleSkip = () => {
        skipConflict();
        onSkip();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-100">
                            Resolve Conflict
                        </h2>
                        <p className="text-sm text-zinc-500 mt-0.5">{conflict.entryName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Diff View */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Local Version */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <h3 className="text-sm font-semibold text-zinc-100">Local Version</h3>
                            </div>
                            <div className="text-xs text-zinc-500">
                                {new Date(localVersion.timestamp).toLocaleString()}
                                <div className="mt-0.5">Device: {localVersion.deviceId}</div>
                            </div>
                            <div className="bg-zinc-800/50 rounded border border-zinc-700 p-4 space-y-2">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const localValue = localVersion.data?.[field];
                                    return (
                                        <div
                                            key={field}
                                            className={`text-sm ${isDifferent ? 'bg-blue-900/30 -mx-2 px-2 py-1 rounded' : ''}`}
                                        >
                                            <span className="text-zinc-500">{field}:</span>{' '}
                                            <span className="text-zinc-100">
                                                {localValue !== undefined ? String(localValue) : <span className="text-zinc-600 italic">-</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Remote Version */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <h3 className="text-sm font-semibold text-zinc-100">Remote Version</h3>
                            </div>
                            <div className="text-xs text-zinc-500">
                                {new Date(remoteVersion.timestamp).toLocaleString()}
                                <div className="mt-0.5">Device: {remoteVersion.deviceId}</div>
                            </div>
                            <div className="bg-zinc-800/50 rounded border border-zinc-700 p-4 space-y-2">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const remoteValue = remoteVersion.data?.[field];
                                    return (
                                        <div
                                            key={field}
                                            className={`text-sm ${isDifferent ? 'bg-emerald-900/30 -mx-2 px-2 py-1 rounded' : ''}`}
                                        >
                                            <span className="text-zinc-500">{field}:</span>{' '}
                                            <span className="text-zinc-100">
                                                {remoteValue !== undefined ? String(remoteValue) : <span className="text-zinc-600 italic">-</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
                    <div className="text-xs text-zinc-500">
                        {conflictingFields.length} field(s) differ
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSkip}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded transition-colors"
                        >
                            <SkipForward size={14} />
                            Skip
                        </button>
                        <button
                            onClick={handleAcceptRemote}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 rounded font-bold transition-colors"
                        >
                            <RotateCcw size={14} />
                            Accept Remote
                        </button>
                        <button
                            onClick={handleAcceptLocal}
                            disabled={isResolving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                            <Check size={14} />
                            Accept Local
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
