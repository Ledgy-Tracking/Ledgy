import { LedgyDocument } from './profile';

/**
 * Field types supported in ledger schemas
 */
export type FieldType = 'text' | 'number' | 'date' | 'relation' | 'long_text' | 'boolean' | 'select' | 'multi_select';

/**
 * Schema field definition
 */
export interface SchemaField {
    name: string;
    type: FieldType;
    required?: boolean;
    // Relation constraint
    relationTarget?: string; // ledger ID if type is 'relation'
    // Text / Long Text constraints
    minLength?: number;
    maxLength?: number;
    pattern?: string; // JavaScript RegExp source string (no delimiters)
    // Number constraints
    min?: number;
    max?: number;
    // Date constraints
    dateMin?: string; // ISO 8601 date string, e.g. "2020-01-01"
    dateMax?: string; // ISO 8601 date string
    dateFormat?: 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:mm:ssZ';
}

/**
 * Ledger schema document
 */
export interface LedgerSchema extends LedgyDocument {
    type: 'schema';
    name: string;
    name_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    fields: SchemaField[];
    profileId: string;
    projectId: string; // Hierarchy: Profile -> Project -> Ledger
}

/**
 * Ledger entry document
 */
export interface LedgerEntry extends LedgyDocument {
    type: 'entry';
    schemaId: string;
    ledgerId: string;
    data: Record<string, unknown>;
    backLinks?: BackLinkMetadata[];
    data_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    profileId: string;
}

/**
 * Derived backlink index metadata written on relation targets.
 * This is recomputable from source entries relation fields.
 */
export interface BackLinkMetadata {
    sourceEntryId: string;
    sourceSchemaId: string;
    sourceLedgerId: string;
    relationField: string;
}

/**
 * A single resolved relation value (flattened from UUID to human-readable display).
 */
export interface ResolvedRelationValue {
    id: string;
    displayValue: string;
    isGhost: boolean;
}

/**
 * A LedgerEntry with optionally resolved relation fields.
 * resolvedRelations maps field name → array of resolved values.
 */
export interface FlattenedEntry extends LedgerEntry {
    resolvedRelations?: Record<string, ResolvedRelationValue[]>;
}

/**
 * Schema metadata for listing (encrypted)
 */
export interface EncryptedLedgerSchemaMetadata {
    _id: string;
    type: 'schema';
    schema_version: number;
    createdAt: string;
    updatedAt: string;
    name_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    name?: string; // Legacy unencrypted
    profileId: string;
    fieldCount: number;
}
