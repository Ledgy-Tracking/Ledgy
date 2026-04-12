import { useEffect, useState, useCallback, useRef } from 'react';
import { useErrorStore } from '@/stores/useErrorStore';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { SchemaField, LedgerSchema } from '@/types/ledger';

export interface UseSchemaFieldsReturn {
    fields: SchemaField[];
    schema: LedgerSchema | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook for fetching and subscribing to schema fields
 * Story 4.5 - Schema field extraction with change detection
 */
export const useSchemaFields = (
    ledgerId: string | undefined
): UseSchemaFieldsReturn => {
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [schema, setSchema] = useState<LedgerSchema | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch schema fields
    const fetchSchema = useCallback(async () => {
        if (!ledgerId || !activeProfileId) {
            setFields([]);
            setSchema(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const db = getProfileDb(activeProfileId);

            // Get schema by ledger ID
            const schemaDoc = await db.getDocument<LedgerSchema>(ledgerId);

            if (!schemaDoc) {
                setError('Ledger schema not found');
                setFields([]);
                setSchema(null);
                return;
            }

            setFields(schemaDoc.fields || []);
            setSchema(schemaDoc);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch schema';
            setError(message);
            useErrorStore.getState().dispatchError(message);
        } finally {
            setIsLoading(false);
        }
    }, [ledgerId, activeProfileId]);

    // Initial fetch
    useEffect(() => {
        fetchSchema();
    }, [fetchSchema]);

    // Subscribe to schema changes
    useEffect(() => {
        if (!ledgerId || !activeProfileId) return;

        const abortController = new AbortController();
        const db = getProfileDb(activeProfileId);

        // Subscribe to changes feed
        const subscription = db.changes({
            since: 'now',
            live: true,
            include_docs: true,
        }).on('change', (change) => {
            if (abortController.signal.aborted) return;

            // Check if this change is relevant to our schema
            const doc = change.doc as LedgerSchema | undefined;
            if (doc?._id === ledgerId && doc?.type === 'schema') {
                // Debounced refresh to handle rapid changes
                if (refreshTimeout.current) {
                    clearTimeout(refreshTimeout.current);
                }
                refreshTimeout.current = setTimeout(() => {
                    if (!abortController.signal.aborted) {
                        setFields(doc.fields || []);
                        setSchema(doc);
                    }
                }, 500);
            }
        }).on('error', (err) => {
            if (!abortController.signal.aborted) {
                const message = `Schema subscription error: ${err.message}`;
                useErrorStore.getState().dispatchError(message);
            }
        });

        return () => {
            abortController.abort();
            subscription.cancel();
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
            }
        };
    }, [ledgerId, activeProfileId]);

    return { fields, schema, isLoading, error };
};
