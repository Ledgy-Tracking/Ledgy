import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteProfileDialogProps {
    profileName: string;
    hasRemoteSync: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Delete Profile Confirmation Dialog
 * Story 5-5: Remote Purge (Right to be Forgotten)
 * 
 * Requires explicit confirmation with profile name typing
 */
export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({
    profileName,
    hasRemoteSync,
    onConfirm,
    onCancel,
}) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const canConfirm = confirmText === profileName;

    const handleConfirm = () => {
        if (!canConfirm) return;
        setIsDeleting(true);
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
                    <AlertTriangle size={20} className="text-red-500 shrink-0" />
                    <h2 className="text-lg font-semibold text-zinc-100">
                        Delete Profile Permanently
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-zinc-300">
                        This action will permanently delete the profile <strong className="text-zinc-100">"{profileName}"</strong> and ALL associated data.
                    </p>

                    {/* Warning Box */}
                    <div className="bg-red-900/20 border border-red-900 rounded p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-red-200 space-y-1">
                                <p><strong>Warning:</strong> This action cannot be undone.</p>
                                {hasRemoteSync && (
                                    <>
                                        <p>• Local PouchDB database will be destroyed</p>
                                        <p>• Remote sync database will be deleted</p>
                                        <p>• All encrypted data will be permanently lost</p>
                                    </>
                                )}
                                {!hasRemoteSync && (
                                    <>
                                        <p>• Local PouchDB database will be destroyed</p>
                                        <p>• All encrypted data will be permanently lost</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Confirmation Input */}
                    <div>
                        <label className="text-xs text-zinc-400 block mb-1.5">
                            Type <strong className="text-zinc-200">"{profileName}"</strong> to confirm deletion:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder={`Type "${profileName}"`}
                            disabled={isDeleting}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isDeleting}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                        <Trash2 size={14} />
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </div>
    );
};
