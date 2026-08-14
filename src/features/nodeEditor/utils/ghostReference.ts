import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';

/**
 * Check if a single document represents a ghost entry
 */
export const isGhostEntry = (doc: any | null): boolean => {
  return !doc || doc.isDeleted === true || doc.deletedAt != null;
};

/**
 * Batch check for ghost references - OPTIMIZED to avoid N+1 queries
 * Returns a Set of entry IDs that are ghosts (deleted or missing)
 */
export const checkGhostReferences = async (
  entryIds: string[]
): Promise<Set<string>> => {
  if (entryIds.length === 0) {
    return new Set();
  }

  const activeProfileId = useProfileStore.getState().activeProfileId;
  if (!activeProfileId) {
    throw new Error('No active profile');
  }

  const db = getProfileDb(activeProfileId);

  // Get all documents that might be ghosts
  const allDocs = await db.getAllDocuments();

  // Create maps for efficient lookup
  const docMap = new Map<string, any>();
  const ghostIds = new Set<string>();

  // Build document map and collect explicitly deleted entries
  allDocs.forEach((doc: any) => {
    docMap.set(doc._id, doc);

    // Check if this document is explicitly marked as deleted
    if (doc.type === 'entry' && (doc.isDeleted === true || doc.deletedAt != null)) {
      ghostIds.add(doc._id);
    }
  });

  // Check for missing documents (not found = ghost)
  entryIds.forEach(entryId => {
    if (!docMap.has(entryId)) {
      ghostIds.add(entryId);
    }
  });

  return ghostIds;
};

/**
 * Enhanced ledger data hydration with ghost reference detection
 * Returns data with ghost information for UI display
 */
export const hydrateLedgerWithGhosts = async (
  ledgerId: string,
  schemaSnapshot: any[],
  _cacheEnabled: boolean = true
) => {
  const activeProfileId = useProfileStore.getState().activeProfileId;
  if (!activeProfileId) {
    throw new Error('No active profile');
  }

  const db = getProfileDb(activeProfileId);

  // Query entries for this ledger
  const allEntries = await db.getAllDocuments();
  const ledgerEntries = allEntries
    .filter((doc: any) =>
      doc.type === 'entry' &&
      doc.ledgerId === ledgerId
      // Note: We include deleted entries here to identify ghosts
    )
    .sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  // Separate ghosts from active entries
  const activeEntries = ledgerEntries.filter(entry => !isGhostEntry(entry));
  const ghostEntries = ledgerEntries.filter(entry => isGhostEntry(entry));

  // Filter active entries to only fields in schema snapshot
  const fieldIds = schemaSnapshot.map(f => f.id);
  const filteredActiveEntries = activeEntries.map((entry: any) => ({
    ...entry,
    data: pickFields(entry.data, fieldIds)
  }));

  // Create ghost indicators
  const ghostIndicators = ghostEntries.map((entry: any) => ({
    entryId: entry._id,
    displayText: '[Deleted Entry]',
    tooltip: 'This entry has been deleted on another device',
    style: 'strikethrough + gray',
    originalData: pickFields(entry.data, fieldIds) // Keep original data for tooltips
  }));

  return {
    entries: filteredActiveEntries,
    ghosts: ghostIndicators,
    ghostCount: ghostIndicators.length,
    totalCount: filteredActiveEntries.length + ghostIndicators.length,
    lastUpdated: Date.now()
  };
};

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
 * Get ghost display information for a single entry
 */
export const getGhostDisplayInfo = (entry: any) => {
  if (!isGhostEntry(entry)) {
    return null;
  }

  return {
    entryId: entry._id || entry.entryId,
    displayText: '[Deleted Entry]',
    tooltip: 'This entry has been deleted on another device',
    style: 'strikethrough + gray',
    icon: '⚠️'
  };
};