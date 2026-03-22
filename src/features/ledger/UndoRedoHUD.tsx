import React from 'react';
import { useUndoRedoStore } from '../../stores/useUndoRedoStore';

export const UndoRedoHUD: React.FC = () => {
    const undo = useUndoRedoStore((state) => state.undoCount());
    const redo = useUndoRedoStore((state) => state.redoCount());

    return (
        <div
            aria-live="polite"
            aria-label={`${undo} undo actions available, ${redo} redo actions available`}
            className="text-zinc-500 opacity-60 text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
            title="Undo/Redo stack"
        >
            <span className="mr-2">↶ {undo}</span>
            <span>↷ {redo}</span>
        </div>
    );
};

