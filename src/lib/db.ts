import PouchDB from 'pouchdb';
import { v4 as uuidv4 } from 'uuid';
import { LedgyDocument, ProfileMetadata } from '../types/profile';
import { decryptPayload, encryptPayload } from '../lib/crypto';

// We use the 'pouchdb-browser' which includes the IndexedDB adapter by default
export class Database {
    private db: PouchDB.Database;
    private profileId: string;
    private replicationInstance: PouchDB.Replication.Sync<{}> | null = null;

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
    async createDocument<T extends LedgyDocument>(type: string, data: Omit<T, keyof LedgyDocument>): Promise<PouchDB.Core.Response> {
        const now = new Date().toISOString();
        const doc: any = {
            _id: `${type}:${uuidv4()}`,
            type: type,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
            ...data,
        };
        return await this.db.put(doc);
    }

    async getDocument<T>(id: string): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
        return await this.db.get<T>(id);
    }

    async hardDeleteDocument(id: string): Promise<PouchDB.Core.Response> {
        const doc = await this.db.get(id);
        return await this.db.remove(doc);
    }

    async updateDocument<T extends object>(id: string, data: T): Promise<PouchDB.Core.Response> {
        const existing = await this.db.get<LedgyDocument>(id);

        // Prevent overwriting immutable envelope fields
        const { _id, _rev, createdAt, schemaVersion, type, ...restData } = data as any;

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
    sync(remoteUrl: string, options?: PouchDB.Replication.SyncOptions) {
        if (this.replicationInstance) {
            this.replicationInstance.cancel();
        }
        this.replicationInstance = this.db.sync(remoteUrl, {
            live: true,
            retry: true,
            ...options
        });
        return this.replicationInstance;
    }

    cancelSync() {
        if (this.replicationInstance) {
            this.replicationInstance.cancel();
            this.replicationInstance = null;
        }
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
 * Hard-deletes a profile record from the master database.
 * NFR12 Compliance: Right-to-be-forgotten requires permanent removal.
 */
export async function hard_delete_profile(masterDb: Database, profileId: string): Promise<void> {
    await masterDb.hardDeleteDocument(profileId);
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

// ==================== PROJECT OPERATIONS ====================

import { ProjectDocument } from '../types/project';

/**
 * Creates a new project document.
 */
export async function create_project(
    db: Database,
    name: string,
    description: string | undefined,
    profileId: string
): Promise<string> {
    const response = await db.createDocument<ProjectDocument>('project', {
        name,
        description,
        profileId,
    });
    if (!response.ok) {
        throw new Error('Failed to create project document');
    }
    return response.id;
}

/**
 * Lists all projects for a profile.
 */
export async function list_projects(db: Database): Promise<ProjectDocument[]> {
    const projectDocs = await db.getAllDocuments<ProjectDocument>('project');
    return projectDocs.filter(doc => !doc.isDeleted);
}

/**
 * Gets a single project by ID.
 */
export async function get_project(db: Database, projectId: string): Promise<ProjectDocument> {
    return await db.getDocument<ProjectDocument>(projectId);
}

/**
 * Soft-deletes a project.
 */
export async function delete_project(db: Database, projectId: string): Promise<void> {
    await db.updateDocument(projectId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
    });
}

// ==================== LEDGER SCHEMA OPERATIONS ====================

import { LedgerSchema, SchemaField, EncryptedLedgerSchemaMetadata, LedgerEntry } from '../types/ledger';

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
    profileId: string,
    projectId: string
): Promise<string> {
    const response = await db.createDocument<LedgerSchema>('schema', {
        name,
        fields,
        profileId,
        projectId,
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
        schemaVersion: schema.schemaVersion + 1,
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
 * Filters out soft-deleted entries by default.
 * @param db - Profile database instance
 * @param ledgerId - Ledger identifier to filter by
 * @returns Array of entry documents (excluding soft-deleted)
 */
export async function list_entries(db: Database, ledgerId: string): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    return entryDocs.filter(doc => !doc.isDeleted && doc.ledgerId === ledgerId);
}

/**
 * Lists all entries for a specific ledger/schema including soft-deleted entries.
 * Used for ghost reference detection.
 * @param db - Profile database instance
 * @param ledgerId - Ledger identifier to filter by
 * @returns Array of all entry documents (including soft-deleted)
 */
export async function list_all_entries(db: Database, ledgerId: string): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    return entryDocs.filter(doc => doc.ledgerId === ledgerId);
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
    await db.updateDocument(entryId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
    });
}

/**
 * Restores a soft-deleted entry by unsetting isDeleted and deletedAt flags.
 * @param db - Profile database instance
 * @param entryId - Entry document ID to restore
 */
export async function restore_entry(db: Database, entryId: string): Promise<void> {
    await db.updateDocument(entryId, {
        isDeleted: false,
        deletedAt: undefined,
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
            type: 'schema',
            schemaVersion: doc.schemaVersion,
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
        await db.getDocument<NodeCanvas>(canvasDocId);
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

// ============================================================================
// Dashboard Layout Functions (Story 4-5)
// ============================================================================

import { WidgetConfig, DashboardLayout } from '../types/dashboard';

/**
 * Dashboard Layout document structure.
 */
// export interface DashboardLayout { ... } removed as it's now in types/dashboard.ts

/**
 * Saves dashboard layout configuration.
 * Story 4-5, AC 5: Layout Persistence.
 * @param db - Profile database instance
 * @param dashboardId - Dashboard identifier (e.g., 'default')
 * @param widgets - Array of widget configurations
 * @param profileId - Profile ID for isolation
 * @returns The dashboard layout ID
 */
export async function save_dashboard_layout(
    db: Database,
    dashboardId: string,
    widgets: WidgetConfig[],
    profileId: string
): Promise<string> {
    const dashboardDocId = `dashboard:${dashboardId}`;

    try {
        // Try to get existing dashboard
        await db.getDocument<DashboardLayout>(dashboardDocId);
        await db.updateDocument(dashboardDocId, {
            widgets,
        });
        return dashboardDocId;
    } catch (e: any) {
        if (e.status === 404) {
            // Dashboard doesn't exist, create it
            const response = await db.createDocument<DashboardLayout>('dashboard', {
                profileId,
                dashboardId,
                widgets,
                layout: {
                    columns: 4,
                    rows: 10,
                },
            });
            return response.id;
        }
        throw e;
    }
}

/**
 * Loads dashboard layout configuration.
 * Story 4-5, AC 5: Layout Persistence.
 * @param db - Profile database instance
 * @param dashboardId - Dashboard identifier
 * @returns Dashboard layout or null if not found
 */
export async function load_dashboard_layout(
    db: Database,
    dashboardId: string
): Promise<DashboardLayout | null> {
    try {
        return await db.getDocument<DashboardLayout>(`dashboard:${dashboardId}`);
    } catch (e: any) {
        if (e.status === 404) {
            return null;
        }
        throw e;
    }
}
import { SyncConfig } from '../types/sync';

/**
 * Saves or updates a sync configuration document.
 * Credentials (URL, username, password) are encrypted before storage.
 * @param db - Profile database instance
 * @param profileId - Profile ID
 * @param config - Plaintext sync configuration
 * @param encryptionKey - AES-GCM encryption key
 */
export async function save_sync_config(
    db: Database,
    profileId: string,
    config: Partial<SyncConfig>,
    encryptionKey: CryptoKey
): Promise<void> {
    const docId = `sync_config:${profileId}`;

    // 1. Encrypt sensitive fields
    const encrypted: any = {
        type: 'sync_config',
        profileId,
        syncDirection: config.syncDirection || 'two-way',
        continuous: config.continuous !== undefined ? config.continuous : true,
    };

    if (config.remoteUrl) {
        const result = await encryptPayload(encryptionKey, config.remoteUrl);
        encrypted.remoteUrl_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
    }

    if (config.username) {
        const result = await encryptPayload(encryptionKey, config.username);
        encrypted.username_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
    }

    if (config.password) {
        const result = await encryptPayload(encryptionKey, config.password);
        encrypted.password_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
    }

    // 2. Save to database
    try {
        const existing = await db.getDocument<any>(docId);
        await db.updateDocument(docId, {
            ...existing,
            ...encrypted,
        });
    } catch (e: any) {
        if (e.status === 404) {
            // Document doesn't exist, create it with explicit ID
            const now = new Date().toISOString();
            const doc = {
                _id: docId,
                type: 'sync_config',
                schemaVersion: 1,
                createdAt: now,
                updatedAt: now,
                ...encrypted
            };
            // Use db.put directly via internal db to specify _id
            // or modify createDocument? Database class uses db.put internally.
            // Let's use db['db'].put(doc) or add a specific method.
            // Actually, the Database class has access to this.db
            // I'll add a helper or use updateDocument logic if I can.
            // For now, I'll use the internal db accessed via cast or just add it to Database.
            await (db as any).db.put(doc);
        } else {
            throw e;
        }
    }
}

/**
 * Loads and decrypts a sync configuration document.
 * @param db - Profile database instance
 * @param profileId - Profile ID
 * @param encryptionKey - AES-GCM encryption key
 * @returns Decrypted SyncConfig or null if not found
 */
export async function get_sync_config(
    db: Database,
    profileId: string,
    encryptionKey: CryptoKey
): Promise<SyncConfig | null> {
    const docId = `sync_config:${profileId}`;

    try {
        const doc = await db.getDocument<any>(docId);
        const config: SyncConfig = {
            ...doc,
            remoteUrl: undefined,
            username: undefined,
            password: undefined
        };

        // Decrypt sensitive fields
        if (doc.remoteUrl_enc) {
            const iv = new Uint8Array(doc.remoteUrl_enc.iv);
            const ciphertext = new Uint8Array(doc.remoteUrl_enc.ciphertext).buffer;
            config.remoteUrl = await decryptPayload(encryptionKey, iv, ciphertext);
        }

        if (doc.username_enc) {
            const iv = new Uint8Array(doc.username_enc.iv);
            const ciphertext = new Uint8Array(doc.username_enc.ciphertext).buffer;
            config.username = await decryptPayload(encryptionKey, iv, ciphertext);
        }

        if (doc.password_enc) {
            const iv = new Uint8Array(doc.password_enc.iv);
            const ciphertext = new Uint8Array(doc.password_enc.ciphertext).buffer;
            config.password = await decryptPayload(encryptionKey, iv, ciphertext);
        }

        return config;
    } catch (e: any) {
        if (e.status === 404) {
            return null;
        }
        throw e;
    }
}

/**
 * Sets up and starts PouchDB replication for a profile.
 * @param profileId - Profile ID
 * @param config - Decrypted sync configuration
 * @returns Replication instance
 */
export function setup_sync(
    profileId: string,
    config: SyncConfig
): PouchDB.Replication.Sync<{}> | PouchDB.Replication.Replication<{}> {
    const db = getProfileDb(profileId);

    // Construct remote URL with credentials
    // Note: This is sensitive, so we only do it in memory
    let remoteUrl = config.remoteUrl;
    if (config.username && config.password && remoteUrl) {
        try {
            const url = new URL(remoteUrl);
            url.username = config.username;
            url.password = config.password;
            remoteUrl = url.toString();
        } catch (e) {
            console.error('Invalid remote URL:', remoteUrl);
        }
    }

    if (!remoteUrl) {
        throw new Error('Remote URL is required for sync');
    }

    const options: PouchDB.Replication.SyncOptions = {
        live: config.continuous,
        retry: true,
    };

    if (config.syncDirection === 'upload') {
        // One-way: Local to Remote
        // Note: db.sync does two-way. For one-way we use replicate.to
        // But the Database class has a sync method. Let's add more flexibility.
        // For simplicity in this story, we'll use a custom replication setup
        return (db as any).db.replicate.to(remoteUrl, options);
    } else {
        // Two-way
        return db.sync(remoteUrl, options);
    }
}
