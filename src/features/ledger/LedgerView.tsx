import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { LedgerTable } from './LedgerTable';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';

/**
 * Ledger view page that displays a ledger table with entry highlighting support.
 * Supports navigation from relation tag chips with entry highlighting (Story 3-3, AC 5).
 */
export const LedgerView: React.FC = () => {
    const { ledgerId } = useParams<{ profileId: string; projectId: string; ledgerId: string }>();
    const location = useLocation();
    const { schemas, fetchSchemas } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);

    const navigate = useNavigate();

    // Extract highlightEntryId from navigation state
    useEffect(() => {
        if (location.state?.highlightEntryId) {
            setHighlightEntryId(location.state.highlightEntryId);
            // Clear the state after extracting using React Router
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    useEffect(() => {
        if (activeProfileId) {
            fetchSchemas(activeProfileId);
        }
    }, [activeProfileId, fetchSchemas]);

    if (!ledgerId) {
        return <div className="p-4 text-zinc-500">No ledger selected</div>;
    }

    const schema = schemas.find(s => s._id === ledgerId);

    if (!schema) {
        return <div className="p-4 text-zinc-500">Ledger not found</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800">
                <h1 className="text-xl font-bold text-zinc-50">{schema.name}</h1>
                {highlightEntryId && (
                    <div className="mt-2 text-sm text-emerald-400">
                        Highlighted entry: {highlightEntryId.slice(-8)}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-auto">
                <LedgerTable schemaId={schema._id} highlightEntryId={highlightEntryId || undefined} />
            </div>
        </div>
    );
};
