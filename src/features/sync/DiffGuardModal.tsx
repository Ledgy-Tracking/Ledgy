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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <RotateCcw size={20} className="text-amber-500" />
                            Resolve Conflict
                        </h2>
                        <p className="text-sm text-zinc-400 mt-0.5 font-medium">Entry: {conflict.entryName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Diff View */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Local Version */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Local</h3>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{localVersion.deviceId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const localValue = localVersion.data?.[field];
                                    const isSelected = mergedData[field] === localValue;

                                    return (
                                        <div
                                            key={field}
                                            onClick={() => toggleFieldSource(field, 'local')}
                                            className={`p-2 rounded-lg cursor-pointer transition-all ${isDifferent
                                                ? isSelected
                                                    ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                                                    : 'bg-blue-900/5 border border-transparent hover:border-blue-500/30'
                                                : 'opacity-50'
                                                }`}
                                        >
                                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{field}</div>
                                            <div className="text-sm break-all">
                                                {localValue !== undefined ? String(localValue) : <span className="text-zinc-700 italic">undefined</span>}
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
                                    <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Remote</h3>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{remoteVersion.deviceId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const remoteValue = remoteVersion.data?.[field];
                                    const isSelected = mergedData[field] === remoteValue;

                                    return (
                                        <div
                                            key={field}
                                            onClick={() => toggleFieldSource(field, 'remote')}
                                            className={`p-2 rounded-lg cursor-pointer transition-all ${isDifferent
                                                ? isSelected
                                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                                                    : 'bg-emerald-900/5 border border-transparent hover:border-emerald-500/30'
                                                : 'opacity-50'
                                                }`}
                                        >
                                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{field}</div>
                                            <div className="text-sm break-all">
                                                {remoteValue !== undefined ? String(remoteValue) : <span className="text-zinc-700 italic">undefined</span>}
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
                                <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Merge Result</h3>
                            </div>
                            <div className="bg-zinc-950/30 rounded-xl border border-dashed border-zinc-700 p-4 space-y-3">
                                {allFields.map(field => {
                                    const isDifferent = conflictingFields.includes(field);
                                    const mergedValue = mergedData[field];
                                    const isFromLocal = mergedValue === localVersion.data?.[field];

                                    return (
                                        <div key={field} className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-[10px] text-zinc-500 font-bold uppercase">{field}</div>
                                                {isDifferent && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${isFromLocal ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        {isFromLocal ? 'from local' : 'from remote'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium text-zinc-300 break-all">
                                                {mergedValue !== undefined ? String(mergedValue) : <span className="text-zinc-700 italic">undefined</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between px-6 py-6 border-t border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-zinc-100">{conflictingFields.length}</span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Conflicts</span>
                        </div>
                        <div className="h-8 w-px bg-zinc-800" />
                        <button
                            onClick={handleSkip}
                            disabled={isResolving}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-xl transition-all"
                        >
                            <SkipForward size={16} />
                            Decline All
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAcceptLocal}
                            disabled={isResolving}
                            className="px-5 py-2.5 text-sm bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all"
                        >
                            Accept Local
                        </button>
                        <button
                            onClick={handleAcceptRemote}
                            disabled={isResolving}
                            className="px-5 py-2.5 text-sm bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all"
                        >
                            Accept Remote
                        </button>
                        <button
                            onClick={handleAcceptMerge}
                            disabled={isResolving}
                            className="px-6 py-2.5 text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2"
                        >
                            {isResolving ? (
                                <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                                <Check size={18} />
                            )}
                            Accept Merge Result
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
