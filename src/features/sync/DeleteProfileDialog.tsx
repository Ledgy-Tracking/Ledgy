import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface DeleteProfileDialogProps {
    profileName: string;
    hasRemoteSync: boolean;
    isOpen: boolean;
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
    isOpen,
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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-md overflow-hidden" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-red-500 shrink-0" />
                        Delete Profile Permanently
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        This action will permanently delete the profile <strong>"{profileName}"</strong> and ALL associated data.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
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
                        <label className="text-xs text-muted-foreground block mb-1.5">
                            Type <strong className="text-foreground">"{profileName}"</strong> to confirm deletion:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder={`Type "${profileName}"`}
                            disabled={isDeleting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={onCancel}
                        disabled={isDeleting}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isDeleting}
                        variant="destructive"
                    >
                        <Trash2 size={14} />
                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
