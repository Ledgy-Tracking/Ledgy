import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { useUndoRedoShortcuts } from '../src/hooks/useUndoRedoShortcuts';

const undoAction = vi.fn(async () => undefined);
const redoAction = vi.fn(async () => undefined);
const fetchEntries = vi.fn(async () => undefined);

vi.mock('../src/features/profiles/useProfileStore', () => ({
    useProfileStore: {
        getState: () => ({ activeProfileId: 'profile:1' }),
    },
}));

vi.mock('../src/stores/useUndoRedoStore', () => ({
    useUndoRedoStore: {
        getState: () => ({
            activeSchemaId: 'schema:1',
            undoAction,
            redoAction,
        }),
    },
}));

vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: {
        getState: () => ({ fetchEntries }),
    },
}));

function TestComponent() {
    useUndoRedoShortcuts();
    return null;
}

describe('useUndoRedoShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('runs undo on Ctrl+Z', async () => {
        render(<TestComponent />);
        const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
        window.dispatchEvent(event);
        await Promise.resolve();
        expect(undoAction).toHaveBeenCalledWith('profile:1');
    });

    it('runs redo on Ctrl+Shift+Z', async () => {
        render(<TestComponent />);
        const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true });
        window.dispatchEvent(event);
        await Promise.resolve();
        expect(redoAction).toHaveBeenCalledWith('profile:1');
    });
});
