import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { useNodeStore } from '../../../stores/useNodeStore';
import { SchemaField } from '../../../types/ledger';

/**
 * Schema change types and their handling
 */
export enum SchemaChangeType {
  FIELD_ADDED = 'field_added',
  FIELD_REMOVED = 'field_removed',
  FIELD_TYPE_CHANGED = 'field_type_changed',
  SCHEMA_VERSION_BUMP = 'schema_version_bump'
}

export interface SchemaChange {
  type: SchemaChangeType;
  ledgerId: string;
  oldSchema: SchemaField[];
  newSchema: SchemaField[];
  changedFields: SchemaField[];
}

/**
 * Detect what type of schema change occurred
 */
export function detectSchemaChange(
  oldSchema: SchemaField[],
  newSchema: SchemaField[]
): SchemaChange | null {
  const oldFieldIds = new Set(oldSchema.map(f => f.id));
  const newFieldIds = new Set(newSchema.map(f => f.id));

  // Check for added fields
  const addedFields = newSchema.filter(f => !oldFieldIds.has(f.id));
  if (addedFields.length > 0) {
    return {
      type: SchemaChangeType.FIELD_ADDED,
      ledgerId: '', // Will be set by caller
      oldSchema,
      newSchema,
      changedFields: addedFields
    };
  }

  // Check for removed fields
  const removedFields = oldSchema.filter(f => !newFieldIds.has(f.id));
  if (removedFields.length > 0) {
    return {
      type: SchemaChangeType.FIELD_REMOVED,
      ledgerId: '',
      oldSchema,
      newSchema,
      changedFields: removedFields
    };
  }

  // Check for type changes
  const typeChangedFields = newSchema.filter(newField => {
    const oldField = oldSchema.find(f => f.id === newField.id);
    return oldField && oldField.type !== newField.type;
  });
  if (typeChangedFields.length > 0) {
    return {
      type: SchemaChangeType.FIELD_TYPE_CHANGED,
      ledgerId: '',
      oldSchema,
      newSchema,
      changedFields: typeChangedFields
    };
  }

  // Check for schema version bump (any other changes)
  if (JSON.stringify(oldSchema) !== JSON.stringify(newSchema)) {
    return {
      type: SchemaChangeType.SCHEMA_VERSION_BUMP,
      ledgerId: '',
      oldSchema,
      newSchema,
      changedFields: []
    };
  }

  return null; // No change
}

/**
 * Handle schema change for affected nodes
 */
export function handleSchemaChangeForNodes(change: SchemaChange): void {
  const state = useNodeStore.getState();
  const affectedNodes = state.nodes.filter(node =>
    node.type === 'ledgerSource' && node.data.ledgerId === change.ledgerId
  );

  affectedNodes.forEach(node => {
    switch (change.type) {
      case SchemaChangeType.FIELD_ADDED:
        // Node continues working; new field available for connections
        console.log(`[SchemaChange] Field added to ledger ${change.ledgerId}, updating node ${node.id}`);
        useNodeStore.getState().updateNodeData(node.id, {
          schemaSnapshot: change.newSchema
        });
        break;

      case SchemaChangeType.FIELD_REMOVED:
        // Mark connections to removed field as invalid; show warning
        console.log(`[SchemaChange] Fields removed from ledger ${change.ledgerId}, marking node ${node.id} as stale`);
        useNodeStore.getState().updateNodeData(node.id, {
          schemaSnapshot: change.newSchema,
          schemaStaleWarning: `Fields removed: ${change.changedFields.map(f => f.name).join(', ')}`
        });
        break;

      case SchemaChangeType.FIELD_TYPE_CHANGED:
        // Re-validate existing connections; warn on type mismatch
        console.log(`[SchemaChange] Field types changed in ledger ${change.ledgerId}, updating node ${node.id}`);
        useNodeStore.getState().updateNodeData(node.id, {
          schemaSnapshot: change.newSchema,
          schemaStaleWarning: `Field types changed: ${change.changedFields.map(f => f.name).join(', ')}`
        });
        break;

      case SchemaChangeType.SCHEMA_VERSION_BUMP:
        // Update node's schemaSnapshot; re-hydrate with new schema
        console.log(`[SchemaChange] Schema version bump for ledger ${change.ledgerId}, re-hydrating node ${node.id}`);
        useNodeStore.getState().updateNodeData(node.id, {
          schemaSnapshot: change.newSchema,
          isLoading: true // Trigger re-hydration
        });
        break;
    }
  });
}

/**
 * Subscribe to schema changes with throttling
 * Uses 100ms debounce to prevent cascade storms
 */
export function setupSchemaChangeSubscription(): () => void {
  const activeProfileId = useProfileStore.getState().activeProfileId;
  if (!activeProfileId) {
    console.warn('[SchemaChange] No active profile, skipping schema change subscription');
    return () => {}; // No-op unsubscribe
  }

  const db = getProfileDb(activeProfileId);
  let debounceTimeout: number | null = null;
  const DEBOUNCE_MS = 100; // Prevent cascade storms

  const handleSchemaChange = (change: PouchDB.Core.ChangesResponseChange<{}>) => {
    const doc = change.doc as any;
    if (!doc || doc.type !== 'schema') return;

    const ledgerId = doc._id.replace('schema:', '');
    const newSchema = doc.fields || [];

    // Get current schema from store to detect changes
    const currentSchemas = useNodeStore.getState().schemas;
    const currentSchemaDoc = currentSchemas.find(s => s._id === `schema:${ledgerId}`);

    if (!currentSchemaDoc) {
      console.log(`[SchemaChange] New schema detected for ledger ${ledgerId}`);
      return; // New schema, will be handled by store update
    }

    const schemaChange = detectSchemaChange(currentSchemaDoc.fields, newSchema);
    if (schemaChange) {
      schemaChange.ledgerId = ledgerId;

      // Debounce schema change handling
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = window.setTimeout(() => {
        console.log(`[SchemaChange] Processing ${schemaChange.type} for ledger ${ledgerId}`);
        handleSchemaChangeForNodes(schemaChange);
        debounceTimeout = null;
      }, DEBOUNCE_MS);
    }
  };

  // Subscribe to schema document changes
  const changes = db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    selector: {
      type: 'schema'
    }
  });

  changes.on('change', handleSchemaChange);
  changes.on('error', (err) => {
    console.error('[SchemaChange] Error in schema change subscription:', err);
  });

  // Return cleanup function
  return () => {
    changes.cancel();
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  };
}