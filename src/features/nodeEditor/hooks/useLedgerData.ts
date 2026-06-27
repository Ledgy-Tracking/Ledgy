import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { SchemaField, LedgerEntry } from '@/types/ledger';
import { useErrorStore } from '@/stores/useErrorStore';
import { ledgerDataCache } from '../utils/ledgerDataCache';

/**
 * Result of ledger data hydration for node display
 */
export interface LedgerDataResult {
  entries: LedgerEntry[];
  count: number;
  aggregates?: {
    sum?: Record<string, number>;
    avg?: Record<string, number>;
    min?: Record<string, number>;
    max?: Record<string, number>;
  };
  lastUpdated: number;
  error?: string;
}

/**
 * Pick only specified fields from an object
 */
function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): Partial<T> {
  const result: Partial<T> = {};
  fields.forEach(field => {
    if (field in obj) {
      result[field as keyof T] = obj[field as keyof T];
    }
  });
  return result;
}

/**
 * Hydrate ledger source node with current data from PouchDB
 * Filters entries to match schema snapshot fields
 * AC1: Ledger Source Node Data Hydration on Load
 */
export async function hydrateLedgerSourceNode(
  ledgerId: string,
  schemaSnapshot: SchemaField[],
  cacheEnabled: boolean = true
): Promise<LedgerDataResult> {
  try {
    // Check cache first (skip if cache disabled)
    if (cacheEnabled) {
      const cachedResult = ledgerDataCache.get(ledgerId, schemaSnapshot);
      if (cachedResult) {
        console.log(`[hydrateLedgerSourceNode] Cache hit for ledger ${ledgerId}`);
        return cachedResult;
      }
    }

    const activeProfileId = useProfileStore.getState().activeProfileId;
    if (!activeProfileId) {
      throw new Error('No active profile');
    }

    const db = getProfileDb(activeProfileId);

    // Query entries for this ledger (equivalent to db.find with selector)
    const allEntries = await db.getAllDocuments<LedgerEntry>('entry');
    const ledgerEntries = allEntries
      .filter(doc =>
        doc.type === 'entry' &&
        doc.ledgerId === ledgerId &&
        !doc.isDeleted
      )
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // descending
      });

    // Filter to only fields in schema snapshot
    const fieldIds = schemaSnapshot.map(f => f.id);
    const filteredEntries = ledgerEntries.map(entry => ({
      ...entry,
      data: pickFields(entry.data, fieldIds)
    }));

    // Calculate aggregates if schema has number fields
    const aggregates: LedgerDataResult['aggregates'] = {};
    const numberFields = schemaSnapshot.filter(f => f.type === 'number');

    if (numberFields.length > 0 && filteredEntries.length > 0) {
      numberFields.forEach(field => {
        let sum = 0;
        let count = 0;
        let min = Infinity;
        let max = -Infinity;

        for (const entry of filteredEntries) {
          const v = entry.data[field.id];
          if (typeof v === 'number' && !isNaN(v)) {
            sum += v;
            count++;
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }

        if (count > 0) {
          aggregates.sum = aggregates.sum || {};
          aggregates.avg = aggregates.avg || {};
          aggregates.min = aggregates.min || {};
          aggregates.max = aggregates.max || {};

          aggregates.sum[field.id] = sum;
          aggregates.avg[field.id] = sum / count;
          aggregates.min[field.id] = min;
          aggregates.max[field.id] = max;
        }
      });
    }

    const result: LedgerDataResult = {
      entries: filteredEntries,
      count: filteredEntries.length,
      aggregates: Object.keys(aggregates).length > 0 ? aggregates : undefined,
      lastUpdated: Date.now()
    };

    // Cache the result
    if (cacheEnabled) {
      ledgerDataCache.set(ledgerId, schemaSnapshot, result);
      console.log(`[hydrateLedgerSourceNode] Cached result for ledger ${ledgerId}`);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to hydrate ledger data';
    useErrorStore.getState().dispatchError(message);

    return {
      entries: [],
      count: 0,
      lastUpdated: Date.now(),
      error: message
    };
  }
}

/**
 * Hook for ledger data hydration in React components
 */
export const useLedgerData = () => {
  const activeProfileId = useProfileStore(s => s.activeProfileId);

  return {
    hydrateLedgerSourceNode,
    activeProfileId
  };
};