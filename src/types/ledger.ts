import { LedgyDocument } from './profile';

/**
 * Field types supported in ledger schemas
 */
export type FieldType = 'text' | 'number' | 'date' | 'relation';

/**
 * Schema field definition
 */
export interface SchemaField {
    name: string;
    type: FieldType;
    relationTarget?: string; // ledger ID if type is 'relation'
    required?: boolean;
}

/**
 * Ledger schema document
 */
export interface LedgerSchema extends LedgyDocument {
    _type: 'schema';
    name: string;
    fields: SchemaField[];
    profileId: string;
}

/**
 * Ledger entry document
 */
export interface LedgerEntry extends LedgyDocument {
    _type: 'entry';
    schemaId: string;
    ledgerId: string;
    data: Record<string, unknown>;
    profileId: string;
}

/**
 * Schema metadata for listing (encrypted)
 */
export interface EncryptedLedgerSchemaMetadata {
    _id: string;
    _type: 'schema';
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
