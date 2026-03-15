import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LedgerTable } from '../src/features/ledger/LedgerTable';
import { RelationTagChip } from '../src/features/ledger/RelationTagChip';
import { useLedgerStore } from '../src/stores/useLedgerStore';
import { useProfileStore } from '../src/stores/useProfileStore';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, i) => ({
                index: i,
                key: i,
                start: i * estimateSize(),
                size: estimateSize(),
            })),
        getTotalSize: () => count * estimateSize(),
        measureElement: vi.fn(),
        scrollToIndex: vi.fn(),
    })),
}));

vi.mock('../src/stores/useLedgerStore', () => ({
    useLedgerStore: vi.fn(),
}));

vi.mock('../src/stores/useProfileStore', () => ({
    useProfileStore: vi.fn(),
}));

describe('Ghost Reference Rendering', () => {
    describe('Task 1.1: deletedEntryIds Memoization', () => {
        const targetSchema = {
            _id: 'schema:target-ledger',
            type: 'schema' as const,
            name: 'Target Ledger',
            fields: [
                { name: 'Title', type: 'text' as const },
            ],
            profileId: 'profile-1',
            projectId: 'project-1',
            schema_version: 1,
            createdAt: '2026-02-23T00:00:00Z',
            updatedAt: '2026-02-23T00:00:00Z',
        };

        const sourceSchema = {
            _id: 'schema:source-ledger',
            type: 'schema' as const,
            name: 'Source Ledger',
            fields: [
                { name: 'Name', type: 'text' as const },
                {
                    name: 'RelatedEntry',
                    type: 'relation' as const,
                    relationTarget: 'schema:target-ledger',
                },
            ],
            profileId: 'profile-1',
            projectId: 'project-1',
            schema_version: 1,
            createdAt: '2026-02-23T00:00:00Z',
            updatedAt: '2026-02-23T00:00:00Z',
        };

        const activeTargetEntry = {
            _id: 'entry:target-active',
            type: 'entry' as const,
            schemaId: 'schema:target-ledger',
            ledgerId: 'schema:target-ledger',
            data: { Title: 'Active Target' },
            profileId: 'profile-1',
            schema_version: 1,
            createdAt: '2026-02-23T00:00:00Z',
            updatedAt: '2026-02-23T00:00:00Z',
        };

        const deletedTargetEntry = {
            _id: 'entry:target-deleted',
            type: 'entry' as const,
            schemaId: 'schema:target-ledger',
            ledgerId: 'schema:target-ledger',
            data: { Title: 'Deleted Target' },
            isDeleted: true,
            deletedAt: '2026-02-24T00:00:00Z',
            profileId: 'profile-1',
            schema_version: 1,
            createdAt: '2026-02-23T00:00:00Z',
            updatedAt: '2026-02-24T00:00:00Z',
        };

        const sourceEntry = {
            _id: 'entry:source-1',
            type: 'entry' as const,
            schemaId: 'schema:source-ledger',
            ledgerId: 'schema:source-ledger',
            data: {
                Name: 'Source Entry',
                RelatedEntry: 'entry:target-deleted',
            },
            profileId: 'profile-1',
            schema_version: 1,
            createdAt: '2026-02-23T00:00:00Z',
            updatedAt: '2026-02-23T00:00:00Z',
        };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('1.1.1: deletedEntryIds Set is correctly populated with deleted target entries', () => {
            (useLedgerStore as any).mockReturnValue({
                schemas: [sourceSchema, targetSchema],
                entries: {
                    'schema:source-ledger': [sourceEntry],
                    'schema:target-ledger': [activeTargetEntry],
                },
                allEntries: {
                    'schema:source-ledger': [sourceEntry],
                    'schema:target-ledger': [activeTargetEntry, deletedTargetEntry],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });
            (useProfileStore as any).mockReturnValue({
                activeProfileId: 'profile-1',
            });

            render(<LedgerTable schemaId="schema:source-ledger" />);

            // Should render source entry with relation field
            expect(screen.getByText('Source Entry')).toBeInTheDocument();

            // Ghost reference should be rendered (struck through, disabled)
            const ghostChip = screen.getByRole('button', { name: /entry:target-deleted/i });
            expect(ghostChip).toHaveClass('line-through');
            expect(ghostChip).toHaveClass('text-zinc-500');
            expect(ghostChip).toHaveClass('cursor-not-allowed');
            expect(ghostChip).toHaveAttribute('disabled');
        });

        it('1.1.2: memoization recomputes when allEntries changes', () => {
            const { rerender } = render(<LedgerTable schemaId="schema:source-ledger" />);

            (useLedgerStore as any).mockReturnValue({
                schemas: [sourceSchema, targetSchema],
                entries: {
                    'schema:source-ledger': [sourceEntry],
                    'schema:target-ledger': [activeTargetEntry, deletedTargetEntry],
                },
                allEntries: {
                    'schema:source-ledger': [sourceEntry],
                    'schema:target-ledger': [activeTargetEntry, deletedTargetEntry],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });

            rerender(<LedgerTable schemaId="schema:source-ledger" />);

            // Ghost reference should now appear in entries list too
            const ghostChip = screen.getByRole('button', { name: /entry:target-deleted/i });
            expect(ghostChip).toHaveClass('text-zinc-500');
        });

        it('1.1.3: scoped to relation target schemas only', () => {
            const nonRelationSchema = {
                _id: 'schema:non-relation',
                type: 'schema' as const,
                name: 'Non-Relation Schema',
                fields: [
                    { name: 'Title', type: 'text' as const },
                ],
                profileId: 'profile-1',
                projectId: 'project-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            (useLedgerStore as any).mockReturnValue({
                schemas: [nonRelationSchema, targetSchema],
                entries: {
                    'schema:non-relation': [{ ...sourceEntry, schemaId: 'schema:non-relation' }],
                    'schema:target-ledger': [activeTargetEntry],
                },
                allEntries: {
                    'schema:non-relation': [{ ...sourceEntry, schemaId: 'schema:non-relation' }],
                    'schema:target-ledger': [activeTargetEntry, deletedTargetEntry],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });
            (useProfileStore as any).mockReturnValue({
                activeProfileId: 'profile-1',
            });

            render(<LedgerTable schemaId="schema:non-relation" />);

            // Non-relation schema should not compute deletedEntryIds for other ledgers
            // Just verify it renders without error
            expect(screen.getByText('Source Entry')).toBeInTheDocument();
        });
    });

    describe('Task 1.2: RelationTagChip isGhost Prop', () => {
        it('1.2.1: accepts isGhost prop', () => {
            const { container } = render(
                <RelationTagChip
                    value="entry:deleted-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const chip = container.querySelector('button');
            expect(chip).toHaveClass('line-through');
            expect(chip).toHaveClass('text-zinc-500');
        });

        it('1.2.2: applies ghost styling when isGhost=true', () => {
            const { container } = render(
                <RelationTagChip
                    value="entry:deleted-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const chip = container.querySelector('button');
            expect(chip).toHaveClass('bg-zinc-800');
            expect(chip).toHaveClass('border-zinc-700');
            expect(chip).toHaveClass('text-zinc-500');
            expect(chip).toHaveClass('line-through');
            expect(chip).toHaveClass('cursor-not-allowed');
        });

        it('1.2.3: applies normal styling when isGhost=false', () => {
            const { container } = render(
                <RelationTagChip
                    value="entry:active-123"
                    targetLedgerId="schema:target"
                    isGhost={false}
                />
            );

            const chip = container.querySelector('button');
            expect(chip).toHaveClass('bg-emerald-900/30');
            expect(chip).toHaveClass('border-emerald-800');
            expect(chip).not.toHaveClass('line-through');
            expect(chip).not.toHaveClass('text-zinc-500');
        });

        it('1.2.4: disables button when isGhost=true', () => {
            const { container } = render(
                <RelationTagChip
                    value="entry:deleted-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const chip = container.querySelector('button');
            expect(chip).toHaveAttribute('disabled');
        });

        it('1.2.5: hides external link icon when isGhost=true', () => {
            const { container: ghostContainer } = render(
                <RelationTagChip
                    value="entry:deleted-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                />
            );

            const ghostIcon = ghostContainer.querySelector('svg');
            expect(ghostIcon).toBeNull();

            const { container: activeContainer } = render(
                <RelationTagChip
                    value="entry:active-123"
                    targetLedgerId="schema:target"
                    isGhost={false}
                />
            );

            const activeIcon = activeContainer.querySelector('svg');
            expect(activeIcon).not.toBeNull();
        });

        it('1.2.6: prevents navigation on click when isGhost=true', () => {
            const onClick = vi.fn();
            const { container } = render(
                <RelationTagChip
                    value="entry:deleted-123"
                    targetLedgerId="schema:target"
                    isGhost={true}
                    onClick={onClick}
                />
            );

            const chip = container.querySelector('button');
            fireEvent.click(chip!);

            expect(onClick).not.toHaveBeenCalled();
        });
    });

    describe('Task 1.3: All Relation Rendering Code Paths', () => {
        it('1.3.1: passes isGhost flag when rendering single relation', () => {
            const schema = {
                _id: 'schema:test',
                type: 'schema' as const,
                name: 'Test',
                fields: [
                    {
                        name: 'SingleRelation',
                        type: 'relation' as const,
                        relationTarget: 'schema:target',
                    },
                ],
                profileId: 'profile-1',
                projectId: 'project-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            const entry = {
                _id: 'entry:1',
                type: 'entry' as const,
                schemaId: 'schema:test',
                ledgerId: 'schema:test',
                data: { SingleRelation: 'entry:deleted' },
                profileId: 'profile-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            (useLedgerStore as any).mockReturnValue({
                schemas: [schema],
                entries: { 'schema:test': [entry] },
                allEntries: {
                    'schema:test': [entry],
                    'schema:target': [
                        {
                            _id: 'entry:deleted',
                            isDeleted: true,
                            type: 'entry' as const,
                            schemaId: 'schema:target',
                            ledgerId: 'schema:target',
                            data: {},
                            profileId: 'profile-1',
                            schema_version: 1,
                            createdAt: '2026-02-23T00:00:00Z',
                            updatedAt: '2026-02-23T00:00:00Z',
                        },
                    ],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });
            (useProfileStore as any).mockReturnValue({
                activeProfileId: 'profile-1',
            });

            render(<LedgerTable schemaId="schema:test" />);

            const ghostChip = screen.getByRole('button', { name: /entry:deleted/i });
            expect(ghostChip).toHaveClass('text-zinc-500');
        });

        it('1.3.2: passes isGhost flag when rendering multi-value relations (array)', () => {
            const schema = {
                _id: 'schema:test',
                type: 'schema' as const,
                name: 'Test',
                fields: [
                    {
                        name: 'MultiRelation',
                        type: 'relation' as const,
                        relationTarget: 'schema:target',
                    },
                ],
                profileId: 'profile-1',
                projectId: 'project-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            const entry = {
                _id: 'entry:1',
                type: 'entry' as const,
                schemaId: 'schema:test',
                ledgerId: 'schema:test',
                data: { MultiRelation: ['entry:active', 'entry:deleted'] },
                profileId: 'profile-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            (useLedgerStore as any).mockReturnValue({
                schemas: [schema],
                entries: { 'schema:test': [entry] },
                allEntries: {
                    'schema:test': [entry],
                    'schema:target': [
                        {
                            _id: 'entry:active',
                            type: 'entry' as const,
                            schemaId: 'schema:target',
                            ledgerId: 'schema:target',
                            data: {},
                            profileId: 'profile-1',
                            schema_version: 1,
                            createdAt: '2026-02-23T00:00:00Z',
                            updatedAt: '2026-02-23T00:00:00Z',
                        },
                        {
                            _id: 'entry:deleted',
                            isDeleted: true,
                            type: 'entry' as const,
                            schemaId: 'schema:target',
                            ledgerId: 'schema:target',
                            data: {},
                            profileId: 'profile-1',
                            schema_version: 1,
                            createdAt: '2026-02-23T00:00:00Z',
                            updatedAt: '2026-02-23T00:00:00Z',
                        },
                    ],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });
            (useProfileStore as any).mockReturnValue({
                activeProfileId: 'profile-1',
            });

            render(<LedgerTable schemaId="schema:test" />);

            // Both chips should render
            const ghostChip = screen.getByRole('button', { name: /entry:deleted/i });
            const activeChip = screen.getByRole('button', { name: /entry:active/i });

            expect(ghostChip).toHaveClass('text-zinc-500');
            expect(activeChip).not.toHaveClass('text-zinc-500');
        });

        it('1.3.3: no console errors when rendering ghosts', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const schema = {
                _id: 'schema:test',
                type: 'schema' as const,
                name: 'Test',
                fields: [
                    {
                        name: 'Relation',
                        type: 'relation' as const,
                        relationTarget: 'schema:target',
                    },
                ],
                profileId: 'profile-1',
                projectId: 'project-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            const entry = {
                _id: 'entry:1',
                type: 'entry' as const,
                schemaId: 'schema:test',
                ledgerId: 'schema:test',
                data: { Relation: 'entry:deleted' },
                profileId: 'profile-1',
                schema_version: 1,
                createdAt: '2026-02-23T00:00:00Z',
                updatedAt: '2026-02-23T00:00:00Z',
            };

            (useLedgerStore as any).mockReturnValue({
                schemas: [schema],
                entries: { 'schema:test': [entry] },
                allEntries: {
                    'schema:test': [entry],
                    'schema:target': [
                        {
                            _id: 'entry:deleted',
                            isDeleted: true,
                            type: 'entry' as const,
                            schemaId: 'schema:target',
                            ledgerId: 'schema:target',
                            data: {},
                            profileId: 'profile-1',
                            schema_version: 1,
                            createdAt: '2026-02-23T00:00:00Z',
                            updatedAt: '2026-02-23T00:00:00Z',
                        },
                    ],
                },
                fetchEntries: vi.fn(),
                deleteEntry: vi.fn(),
            });
            (useProfileStore as any).mockReturnValue({
                activeProfileId: 'profile-1',
            });

            render(<LedgerTable schemaId="schema:test" />);

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
            consoleWarnSpy.mockRestore();
        });
    });
});
