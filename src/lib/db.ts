import PouchDB from 'pouchdb';
import { v4 as uuidv4 } from 'uuid';
import { LedgyDocument, ProfileMetadata } from '../types/profile';
import { decryptPayload } from '../lib/crypto';

// We use the 'pouchdb-browser' which includes the IndexedDB adapter by default
export class Database {
    private db: PouchDB.Database;
    private profileId: string;

    constructor(profileId: string) {
        this.profileId = profileId;
        // Architecture: "Ensure database naming/prefixing prevents intersection."
        // Format: ledgy_profile_{id}
        this.db = new PouchDB(`ledgy_profile_${profileId}`);
    }

    /**
     * Create a new document with the standard Ledgy envelope.
     * ID Scheme: {type}:{uuid}
     */
    async createDocument<T extends object>(type: string, data: T): Promise<PouchDB.Core.Response> {
        const now = new Date().toISOString();
        const doc: LedgyDocument & T = {
            _id: `${type}:${uuidv4()}`,
            type: type,
            schema_version: 1,
            createdAt: now,
            updatedAt: now,
            ...data,
        };
        return await this.db.put(doc);
    }

    async getDocument<T>(id: string): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
        return await this.db.get<T>(id);
    }

    async updateDocument<T extends object>(id: string, data: T): Promise<PouchDB.Core.Response> {
        const existing = await this.db.get<LedgyDocument>(id);

        // Prevent overwriting immutable envelope fields
        const { _id, _rev, createdAt, schema_version, type, ...restData } = data as any;

        const updatedDoc = {
            ...existing,
            ...restData,
            updatedAt: new Date().toISOString(),
        };
        return await this.db.put(updatedDoc);
    }

    async getAllDocuments<T>(type?: string): Promise<T[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: type ? `${type}:` : undefined,
            endkey: type ? `${type}:\ufff0` : undefined,
        });
        return result.rows
            .map(row => row.doc as unknown as T)
            .filter(doc => doc !== undefined);
    }

    // Example sync operation
    sync(remoteUrl: string) {
        return this.db.sync(remoteUrl, {
            live: true,
            retry: true,
        });
    }

    async destroy() {
        const result = await this.db.destroy();
        delete profileDatabases[this.profileId];
        return result;
    }

    async close() {
        const result = await this.db.close();
        delete profileDatabases[this.profileId];
        return result;
    }
}

// Global registry for currently active profile DBs
let profileDatabases: Record<string, Database> = {};

/**
 * Returns a dedicated PouchDB instance for a given profile ID.
 */
export function getProfileDb(profileId: string): Database {
    if (!profileDatabases[profileId]) {
        profileDatabases[profileId] = new Database(profileId);
    }
    return profileDatabases[profileId];
}

/**
 * Closes and removes a profile DB from the active registry.
 * This is important for garbage collection when switching profiles.
 */
export async function closeProfileDb(profileId: string): Promise<void> {
    if (profileDatabases[profileId]) {
        await profileDatabases[profileId].close();
    }
}

/**
 * Internal helper to clear the registry (mainly for tests).
 */
export function _clearProfileDatabases() {
    profileDatabases = {};
}

/**
 * Creates a new profile document in the master database.
 * Returns the profile ID on success.
 */
export async function create_profile(
    masterDb: Database,
    name: string,
    description?: string
): Promise<string> {
    const response = await masterDb.createDocument('profile', {
        name,
        description,
    });
    if (!response.ok) {
        throw new Error('Failed to create profile document');
    }
    return response.id;
}

/**
 * Creates a new profile document in the master database with encrypted metadata.
 * Returns the profile ID on success.
 */
export async function create_profile_encrypted(
    masterDb: Database,
    encryptedName: { iv: number[]; ciphertext: number[] },
    encryptedDescription?: { iv: number[]; ciphertext: number[] }
): Promise<string> {
    const response = await masterDb.createDocument('profile', {
        name_enc: encryptedName,
        description_enc: encryptedDescription,
    });
    if (!response.ok) {
        throw new Error('Failed to create profile document');
    }
    return response.id;
}

/**
 * Lists all profiles from the master database.
 * Returns array of profile documents including metadata.
 */
export async function list_profiles(masterDb: Database): Promise<any[]> {
    const profileDocs = await masterDb.getAllDocuments<any>('profile');
    return profileDocs.filter(doc => !doc.isDeleted);
}

/**
 * Decrypts profile metadata from encrypted profile documents.
 * This moves encryption logic from the store to the DAL layer.
 * 
 * @param profileDocs - Array of profile documents from PouchDB
 * @param encryptionKey - AES-GCM encryption key
 * @returns Array of decrypted ProfileMetadata objects
 */
export async function decryptProfileMetadata(
    profileDocs: any[],
    encryptionKey: CryptoKey
): Promise<ProfileMetadata[]> {
    const activeProfiles = profileDocs.filter(doc => !doc.isDeleted);
    
    // Process profiles sequentially to avoid overwhelming the JS thread
    // Note: BATCH_SIZE removed - sequential processing is more predictable and easier to debug
    const profiles: ProfileMetadata[] = [];
    
    for (const doc of activeProfiles) {
        let name = doc.name;
        let description = doc.description;

        // Type-safe encrypted metadata access
        if (doc.name_enc && typeof doc.name_enc === 'object') {
            try {
                const iv = new Uint8Array(doc.name_enc.iv);
                const ciphertext = new Uint8Array(doc.name_enc.ciphertext).buffer;
                name = await decryptPayload(encryptionKey, iv, ciphertext);

                if (doc.description_enc && typeof doc.description_enc === 'object') {
                    const dIv = new Uint8Array(doc.description_enc.iv);
                    const dCiphertext = new Uint8Array(doc.description_enc.ciphertext).buffer;
                    description = await decryptPayload(encryptionKey, dIv, dCiphertext);
                }
            } catch (e) {
                console.error('Failed to decrypt profile:', e);
                name = `[Encrypted Profile ${doc._id?.slice(-4) || 'unknown'}]`;
            }
        }

        profiles.push({
            id: doc._id,
            name,
            description,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            remoteSyncEndpoint: doc.remoteSyncEndpoint,
        });
    }

    return profiles;
}

// ==================== LEDGER SCHEMA OPERATIONS ====================

import { LedgerSchema, SchemaField, EncryptedLedgerSchemaMetadata } from '../types/ledger';
import { encryptPayload, decryptPayload } from './crypto';

/**
 * Creates a new ledger schema document.
 * @param db - Profile database instance
 * @param name - Schema name
 * @param fields - Array of schema fields
 * @returns The created schema ID
 */
export async function create_schema(
    db: Database,
    name: string,
    fields: SchemaField[],
    profileId: string
): Promise<string> {
    const response = await db.createDocument<LedgerSchema>('schema', {
        name,
        fields,
        profileId,
    });
    if (!response.ok) {
        throw new Error('Failed to create schema document');
    }
    return response.id;
}

/**
 * Updates an existing ledger schema document.
 * Increments schema_version for JIT migration support (NFR9).
 * @param db - Profile database instance
 * @param schemaId - Schema document ID
 * @param name - Updated schema name
 * @param fields - Updated schema fields
 */
export async function update_schema(
    db: Database,
    schemaId: string,
    name: string,
    fields: SchemaField[]
): Promise<void> {
    const schema = await db.getDocument<LedgerSchema>(schemaId);
    await db.updateDocument(schemaId, {
        name,
        fields,
        schema_version: schema.schema_version + 1,
    });
}

/**
 * Lists all ledger schemas for a profile.
 * @param db - Profile database instance
 * @returns Array of schema documents
 */
export async function list_schemas(db: Database): Promise<LedgerSchema[]> {
    const schemaDocs = await db.getAllDocuments<LedgerSchema>('schema');
    return schemaDocs.filter(doc => !doc.isDeleted);
}

/**
 * Gets a single schema by ID.
 * @param db - Profile database instance
 * @param schemaId - Schema document ID
 */
export async function get_schema(db: Database, schemaId: string): Promise<LedgerSchema> {
    return await db.getDocument<LedgerSchema>(schemaId);
}

/**
 * Creates a new ledger entry document.
 * @param db - Profile database instance
 * @param schemaId - Reference to the schema
 * @param ledgerId - Ledger identifier (same as schemaId for simple cases)
 * @param data - Entry data matching schema fields
 * @param profileId - Profile ID for isolation
 * @returns The created entry ID
 */
export async function create_entry(
    db: Database,
    schemaId: string,
    ledgerId: string,
    data: Record<string, unknown>,
    profileId: string
): Promise<string> {
    const response = await db.createDocument<LedgerEntry>('entry', {
        schemaId,
        ledgerId,
        data,
        profileId,
    });
    if (!response.ok) {
        throw new Error('Failed to create entry document');
    }
    return response.id;
}

/**
 * Updates an existing ledger entry document.
 * @param db - Profile database instance
 * @param entryId - Entry document ID
 * @param data - Updated entry data
 */
export async function update_entry(
    db: Database,
    entryId: string,
    data: Record<string, unknown>
): Promise<void> {
    await db.updateDocument(entryId, { data });
}

/**
 * Lists all entries for a specific ledger/schema.
 * @param db - Profile database instance
 * @param ledgerId - Ledger identifier to filter by
 * @returns Array of entry documents
 */
export async function list_entries(db: Database, ledgerId: string): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    return entryDocs.filter(doc => !doc.isDeleted && doc.ledgerId === ledgerId);
}

/**
 * Finds all entries that have relation fields pointing to a specific entry ID.
 * Used for bidirectional back-link display (Story 3-3).
 * @param db - Profile database instance
 * @param targetEntryId - The entry ID to find back-links for
 * @returns Array of entries that reference the target entry
 */
export async function find_entries_with_relation_to(
    db: Database,
    targetEntryId: string
): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    return entryDocs.filter(doc => {
        if (doc.isDeleted) return false;
        
        // Check each field in the entry's data
        for (const fieldName of Object.keys(doc.data)) {
            const value = doc.data[fieldName];
            // Handle single relation (string) or multiple relations (string[])
            if (Array.isArray(value)) {
                if (value.includes(targetEntryId)) return true;
            } else if (value === targetEntryId) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Soft-deletes an entry (Ghost Reference pattern - NFR4, NFR10).
 * @param db - Profile database instance
 * @param entryId - Entry document ID
 */
export async function delete_entry(db: Database, entryId: string): Promise<void> {
    const entry = await db.getDocument<LedgerEntry>(entryId);
    await db.updateDocument(entryId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
    });
}

/**
 * Decrypts ledger schema metadata from encrypted documents.
 * @param schemaDocs - Array of schema documents from PouchDB
 * @param encryptionKey - AES-GCM encryption key
 * @returns Array of schema metadata
 */
export async function decryptSchemaMetadata(
    schemaDocs: any[],
    encryptionKey: CryptoKey
): Promise<EncryptedLedgerSchemaMetadata[]> {
    const activeSchemas = schemaDocs.filter(doc => !doc.isDeleted);
    const schemas: EncryptedLedgerSchemaMetadata[] = [];

    for (const doc of activeSchemas) {
        let name = doc.name;

        if (doc.name_enc && typeof doc.name_enc === 'object') {
            try {
                const iv = new Uint8Array(doc.name_enc.iv);
                const ciphertext = new Uint8Array(doc.name_enc.ciphertext).buffer;
                name = await decryptPayload(encryptionKey, iv, ciphertext);
            } catch (e) {
                console.error('Failed to decrypt schema:', e);
                name = `[Encrypted Schema ${doc._id?.slice(-4) || 'unknown'}]`;
            }
        }

        schemas.push({
            _id: doc._id,
            _type: 'schema',
            schema_version: doc.schema_version,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            name_enc: doc.name_enc,
            name,
            profileId: doc.profileId,
            fieldCount: doc.fields?.length || 0,
        });
    }

    return schemas;
}

// ==================== NODE CANVAS OPERATIONS ====================

import { NodeCanvas, CanvasNode, CanvasEdge, Viewport } from '../types/nodeEditor';

/**
 * Creates or updates a node canvas document.
 * @param db - Profile database instance
 * @param canvasId - Canvas identifier (e.g., 'default')
 * @param nodes - Array of canvas nodes
 * @param edges - Array of canvas edges
 * @param viewport - Viewport state
 * @param profileId - Profile ID for isolation
 * @returns The canvas ID
 */
export async function save_canvas(
    db: Database,
    canvasId: string,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    viewport: Viewport,
    profileId: string
): Promise<string> {
    const canvasDocId = `canvas:${canvasId}`;
    
    try {
        // Try to get existing canvas
        const existing = await db.getDocument<NodeCanvas>(canvasDocId);
        await db.updateDocument(canvasDocId, {
            nodes,
            edges,
            viewport,
        });
        return canvasDocId;
    } catch (e: any) {
        if (e.status === 404) {
            // Canvas doesn't exist, create it
            const response = await db.createDocument<NodeCanvas>('canvas', {
                profileId,
                canvasId,
                nodes,
                edges,
                viewport,
            });
            return response.id;
        }
        throw e;
    }
}

/**
 * Loads a node canvas document.
 * @param db - Profile database instance
 * @param canvasId - Canvas identifier
 * @returns Canvas document or null if not found
 */
export async function load_canvas(
    db: Database,
    canvasId: string
): Promise<NodeCanvas | null> {
    try {
        return await db.getDocument<NodeCanvas>(`canvas:${canvasId}`);
    } catch (e: any) {
        if (e.status === 404) {
            return null;
        }
        throw e;
    }
}
