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
    data_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    profileId: string;
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
