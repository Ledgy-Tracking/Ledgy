import { useEffect } from 'react';
import { useProfileStore } from '../features/profiles/useProfileStore';
import { useUndoRedoStore } from '../stores/useUndoRedoStore';
import { useLedgerStore } from '../stores/useLedgerStore';

function isUndo(e: KeyboardEvent): boolean {
    return (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
}

function isRedo(e: KeyboardEvent): boolean {
    return (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z';
}

export function useUndoRedoShortcuts(): void {
    useEffect(() => {
        const handle = async (e: KeyboardEvent) => {
            if (!isUndo(e) && !isRedo(e)) {
                return;
            }
            // AC 6: If focus is inside an input or textarea, let the browser
            // handle its native undo (text field editing). Only intercept when
            // focus is outside form controls.
            const target = e.target as HTMLElement | null;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
                return;
            }
            e.preventDefault();
            const activeProfileId = useProfileStore.getState().activeProfileId;
            if (!activeProfileId) {
                return;
            }
            const undoRedo = useUndoRedoStore.getState();
            if (isUndo(e)) {
                await undoRedo.undoAction(activeProfileId);
            } else {
                await undoRedo.redoAction(activeProfileId);
            }

            const schemaId = useUndoRedoStore.getState().activeSchemaId;
            if (schemaId) {
                await useLedgerStore.getState().fetchEntries(activeProfileId, schemaId);
            }
        };

        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, []);
}

