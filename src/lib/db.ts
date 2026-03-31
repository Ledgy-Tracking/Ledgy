import { isLocalNetwork } from '../utils/network';
import PouchDB from 'pouchdb';
import { v4 as uuidv4 } from 'uuid';
import { LedgyDocument, ProfileMetadata } from '../types/profile';
import { decryptPayload, encryptPayload } from '../lib/crypto';
import { useErrorStore } from '../stores/useErrorStore';
import { validateEntryAgainstSchema } from './validation';

// Validation: Reject fields starting with _ (reserved for PouchDB)
function validateDocumentFields(doc: Partial<LedgyDocument>): void {
    for (const key of Object.keys(doc)) {
        if (key.startsWith('_') && !['_id', '_rev', '_deleted'].includes(key)) {
            throw new Error(`Invalid field "${key}": Fields starting with "_" are reserved for PouchDB internal use`);
        }
    }
}

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
        try {
            // Validate no reserved fields
            validateDocumentFields(data as Partial<LedgyDocument>);

            // Reject manually-crafted IDs — all IDs are auto-generated as {type}:{uuid}
            if ('_id' in (data as object)) {
                throw new Error(`Invalid field "_id": Document IDs are auto-generated as {type}:{uuid} — do not supply a custom _id`);
            }

            const now = new Date().toISOString();
            const doc: Record<string, unknown> = {
                _id: `${type}:${uuidv4()}`,
                type: type,
                schema_version: 1,
                createdAt: now,
                updatedAt: now,
                ...data,
            };
            return await this.db.put(doc);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
            useErrorStore.getState().dispatchError(errorMessage, 'error');
            throw error;
        }
    }

    async getDocument<T>(id: string, options?: PouchDB.Core.GetOptions): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
        try {
            return await this.db.get<T>(id, options || {});
        } catch (error) {
            if ((error as PouchDB.Core.Error).status === 404) {
                return null as any;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to get document';
            useErrorStore.getState().dispatchError(errorMessage, 'error');
            throw error;
        }
    }

    /**
     * Soft delete a document (ghost reference pattern)
     * Marks document as deleted without removing from database
     */
    async softDeleteDocument(id: string): Promise<PouchDB.Core.Response> {
        try {
            const doc = await this.db.get<LedgyDocument>(id);
            const updatedDoc = {
                ...doc,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
            };
            return await this.db.put(updatedDoc);
        } catch (error) {
            if ((error as PouchDB.Core.Error).status === 404) {
                throw new Error(`Document ${id} not found`);
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to soft delete document';
            useErrorStore.getState().dispatchError(errorMessage, 'error');
            throw error;
        }
    }

    async hardDeleteDocument(id: string): Promise<PouchDB.Core.Response> {
        try {
            const doc = await this.db.get(id);
            return await this.db.remove(doc);
        } catch (error) {
            if ((error as PouchDB.Core.Error).status === 404) {
                throw new Error(`Document ${id} not found`);
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to hard delete document';
            useErrorStore.getState().dispatchError(errorMessage, 'error');
            throw error;
        }
    }

    async removeRevision(id: string, rev: string): Promise<PouchDB.Core.Response> {
        return await this.db.remove(id, rev);
    }

    async updateDocument<T extends object>(id: string, data: T): Promise<PouchDB.Core.Response> {
        // Validate no reserved fields in incoming data
        validateDocumentFields(data as Partial<LedgyDocument>);

        const existing = await this.db.get<LedgyDocument>(id);

        // Prevent overwriting truly immutable envelope fields (_id, _rev, createdAt, type).
        // schema_version is intentionally mutable — update_schema bumps it for JIT migration (NFR9).
        const { _id, _rev, createdAt, type, ...restData } = data as any;

        const updatedDoc = {
            ...existing,
            ...restData,
            updatedAt: new Date().toISOString(),
        };
        return await this.db.put(updatedDoc);
    }

    /**
     * Applies multiple document patches in a single PouchDB bulk operation.
     * Each patch merges into the existing document and refreshes updatedAt.
     */
    async bulkPatchDocuments(
        patches: Array<{ id: string; data: Record<string, unknown> }>
    ): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>> {
        for (const patch of patches) {
            validateDocumentFields(patch.data as Partial<LedgyDocument>);
        }

        const timestamp = new Date().toISOString();
        const docs = await Promise.all(
            patches.map(async ({ id, data }) => {
                const existing = await this.db.get<LedgyDocument>(id);
                const { _id, _rev, createdAt, type, ...restData } = data as any;
                return {
                    ...existing,
                    ...restData,
                    updatedAt: timestamp,
                };
            })
        );

        return await this.db.bulkDocs(docs as PouchDB.Core.PutDocument<{}>[]);
    }

    /**
     * Query documents, excluding soft-deleted by default
     */
    async queryDocuments<T>(options?: {
        type?: string;
        includeDeleted?: boolean;
    }): Promise<T[]> {
        const result = await this.db.allDocs({
            include_docs: true,
            startkey: options?.type ? `${options.type}:` : undefined,
            endkey: options?.type ? `${options.type}:\ufff0` : undefined,
        });
        return result.rows
            .map(row => row.doc as unknown as T)
            .filter(doc => {
                if (!doc) return false;
                // Exclude soft-deleted unless explicitly included
                if (!options?.includeDeleted && (doc as any).isDeleted) {
                    return false;
                }
                return true;
            });
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
        profileDatabases[profileId].cancelSync();
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
 * Destroys all active profile databases and the master database from IndexedDB.
 * Called on vault reset to ensure a new account starts with a clean slate.
 */
export async function destroyAllDatabases(): Promise<void> {
    const ids = Object.keys(profileDatabases);
    for (const id of ids) {
        try {
            profileDatabases[id].cancelSync();
            await profileDatabases[id].destroy();
        } catch {
            // Ignore — DB may already be gone
        }
    }
    profileDatabases = {};

    // Destroy master DB if it was not open in the registry
    if (!ids.includes('master')) {
        try {
            const masterPouchDb = new PouchDB('ledgy_profile_master');
            await masterPouchDb.destroy();
        } catch {
            // Ignore — master DB may not exist yet
        }
    }
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
    encryptedDescription?: { iv: number[]; ciphertext: number[] },
    color?: string,
    avatar?: string
): Promise<string> {
    const response = await masterDb.createDocument('profile', {
        name_enc: encryptedName,
        description_enc: encryptedDescription,
        color,
        avatar
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
            color: doc.color,
            avatar: doc.avatar,
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

import { LedgerSchema, SchemaField, EncryptedLedgerSchemaMetadata, LedgerEntry, BackLinkMetadata } from '../types/ledger';
import { migrateEntryData } from './migration';

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
    projectId: string,
    encryptionKey?: CryptoKey
): Promise<string> {
    const schemaData: any = {
        fields,
        profileId,
        projectId,
    };

    if (encryptionKey) {
        const result = await encryptPayload(encryptionKey, name);
        schemaData.name_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
        schemaData.name = `[Encrypted]`;
    } else {
        schemaData.name = name;
    }

    const response = await db.createDocument<LedgerSchema>('schema', schemaData);
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
    fields: SchemaField[],
    encryptionKey?: CryptoKey
): Promise<void> {
    const schema = await get_schema(db, schemaId);
    const updateData: any = {
        fields,
        schema_version: schema.schema_version + 1,
    };

    if (encryptionKey) {
        const result = await encryptPayload(encryptionKey, name);
        updateData.name_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
        updateData.name = `[Encrypted]`;
    } else {
        updateData.name = name;
    }

    await db.updateDocument(schemaId, updateData);
}

/**
 * Lists all ledger schemas for a profile.
 * @param db - Profile database instance
 * @returns Array of schema documents
 */
export async function list_schemas(
    db: Database,
    encryptionKey?: CryptoKey
): Promise<LedgerSchema[]> {
    const schemaDocs = await db.getAllDocuments<LedgerSchema>('schema');
    const activeSchemas = schemaDocs.filter(doc => !doc.isDeleted);

    if (encryptionKey) {
        return await Promise.all(activeSchemas.map(async schema => {
            if (schema.name_enc) {
                try {
                    const iv = new Uint8Array(schema.name_enc.iv);
                    const ciphertext = new Uint8Array(schema.name_enc.ciphertext).buffer;
                    const name = await decryptPayload(encryptionKey, iv, ciphertext);
                    return { ...schema, name };
                } catch (e) {
                    console.error('Failed to decrypt schema name:', schema._id, e);
                }
            }
            return schema;
        }));
    }

    return activeSchemas;
}

/**
 * Soft-deletes a ledger schema.
 * @param db - Profile database instance
 * @param schemaId - Schema document ID
 */
export async function delete_schema(db: Database, schemaId: string): Promise<void> {
    await db.updateDocument(schemaId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
    });
}

/**
 * Gets a single schema by ID.
 * Throws a descriptive error (not a raw PouchDB 404) when not found.
 * @param db - Profile database instance
 * @param schemaId - Schema document ID
 */
export async function get_schema(db: Database, schemaId: string): Promise<LedgerSchema> {
    const schema = await db.getDocument<LedgerSchema>(schemaId);
    if (!schema) {
        throw new Error(`Schema not found: ${schemaId}`);
    }
    return schema;
}

/**
 * Gets a single entry by ID.
 * Throws a descriptive error (not a raw PouchDB 404) when not found.
 * @param db - Profile database instance
 * @param entryId - Entry document ID
 */
export async function get_entry(db: Database, entryId: string): Promise<LedgerEntry> {
    const entry = await db.getDocument<LedgerEntry>(entryId);
    if (!entry) {
        throw new Error(`Entry not found: ${entryId}`);
    }
    return entry;
}

type RelationTargetsByEntryId = Map<string, Set<string>>;

interface BackLinkSourceContext {
    sourceEntryId: string;
    sourceSchemaId: string;
    sourceLedgerId: string;
}

function getRelationFieldNames(schema: LedgerSchema): string[] {
    return schema.fields
        .filter((field) => field.type === 'relation')
        .map((field) => field.name);
}

function normalizeRelationTargetIds(value: unknown): string[] {
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value];
    }

    if (Array.isArray(value)) {
        return value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    return [];
}

function extractRelationTargets(
    data: Record<string, unknown>,
    schema: LedgerSchema
): RelationTargetsByEntryId {
    const relationTargetsByEntryId: RelationTargetsByEntryId = new Map();

    for (const fieldName of getRelationFieldNames(schema)) {
        const targetIds = normalizeRelationTargetIds(data[fieldName]);
        for (const targetId of targetIds) {
            if (!relationTargetsByEntryId.has(targetId)) {
                relationTargetsByEntryId.set(targetId, new Set());
            }
            relationTargetsByEntryId.get(targetId)!.add(fieldName);
        }
    }

    return relationTargetsByEntryId;
}

function diffRelationTargets(
    previousTargets: RelationTargetsByEntryId,
    nextTargets: RelationTargetsByEntryId
): { added: RelationTargetsByEntryId; removed: RelationTargetsByEntryId } {
    const added: RelationTargetsByEntryId = new Map();
    const removed: RelationTargetsByEntryId = new Map();
    const targetIds = new Set([...previousTargets.keys(), ...nextTargets.keys()]);

    for (const targetId of targetIds) {
        const previousFields = previousTargets.get(targetId) ?? new Set<string>();
        const nextFields = nextTargets.get(targetId) ?? new Set<string>();

        const addedFields = new Set<string>(
            [...nextFields].filter((fieldName) => !previousFields.has(fieldName))
        );
        const removedFields = new Set<string>(
            [...previousFields].filter((fieldName) => !nextFields.has(fieldName))
        );

        if (addedFields.size > 0) {
            added.set(targetId, addedFields);
        }

        if (removedFields.size > 0) {
            removed.set(targetId, removedFields);
        }
    }

    return { added, removed };
}

function buildBackLinkRecord(
    source: BackLinkSourceContext,
    relationField: string
): BackLinkMetadata {
    return {
        sourceEntryId: source.sourceEntryId,
        sourceSchemaId: source.sourceSchemaId,
        sourceLedgerId: source.sourceLedgerId,
        relationField,
    };
}

function backLinkIdentity(backLink: BackLinkMetadata): string {
    return `${backLink.sourceEntryId}::${backLink.sourceSchemaId}::${backLink.sourceLedgerId}::${backLink.relationField}`;
}

function normalizeBackLinks(backLinks: BackLinkMetadata[]): BackLinkMetadata[] {
    const byIdentity = new Map<string, BackLinkMetadata>();
    for (const backLink of backLinks) {
        byIdentity.set(backLinkIdentity(backLink), backLink);
    }

    return [...byIdentity.values()].sort((a, b) =>
        backLinkIdentity(a).localeCompare(backLinkIdentity(b))
    );
}

function applyBackLinkChanges(
    existingBackLinks: BackLinkMetadata[] | undefined,
    source: BackLinkSourceContext,
    addedFields: Set<string>,
    removedFields: Set<string>
): BackLinkMetadata[] {
    const filteredExisting = (existingBackLinks ?? []).filter((backLink) => {
        if (backLink.sourceEntryId !== source.sourceEntryId) {
            return true;
        }
        return !removedFields.has(backLink.relationField);
    });

    const additions = [...addedFields].map((relationField) =>
        buildBackLinkRecord(source, relationField)
    );

    return normalizeBackLinks([...filteredExisting, ...additions]);
}

function areBackLinksEqual(a: BackLinkMetadata[] | undefined, b: BackLinkMetadata[] | undefined): boolean {
    const left = normalizeBackLinks(a ?? []);
    const right = normalizeBackLinks(b ?? []);
    if (left.length !== right.length) {
        return false;
    }
    return left.every((value, index) => backLinkIdentity(value) === backLinkIdentity(right[index]));
}

async function getRelationDataForEntry(
    entry: LedgerEntry,
    encryptionKey?: CryptoKey
): Promise<Record<string, unknown>> {
    if (!entry.data_enc) {
        return entry.data;
    }

    if (!encryptionKey) {
        throw new Error(`Cannot reconcile relation backlinks for encrypted entry without encryption key: ${entry._id}`);
    }

    const decryptedEntry = await decryptLedgerEntry(entry, encryptionKey);
    return decryptedEntry.data;
}

async function reconcileBackLinksForSource(
    db: Database,
    source: BackLinkSourceContext,
    previousTargets: RelationTargetsByEntryId,
    nextTargets: RelationTargetsByEntryId
): Promise<void> {
    const { added, removed } = diffRelationTargets(previousTargets, nextTargets);
    const targetIds = [...new Set([...added.keys(), ...removed.keys()])].sort((a, b) => a.localeCompare(b));

    if (targetIds.length === 0) {
        return;
    }

    const docsById = await Promise.all(
        targetIds.map(async (targetId) => ({
            targetId,
            doc: await db.getDocument<LedgerEntry>(targetId),
        }))
    );

    const patches: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const { targetId, doc } of docsById) {
        if (!doc) {
            useErrorStore.getState().dispatchError(
                `Backlink sync skipped: target entry not found (${targetId})`,
                'warning'
            );
            continue;
        }

        if (doc.isDeleted) {
            useErrorStore.getState().dispatchError(
                `Backlink sync skipped: target entry is soft-deleted (${targetId})`,
                'warning'
            );
            continue;
        }

        const nextBackLinks = applyBackLinkChanges(
            doc.backLinks,
            source,
            added.get(targetId) ?? new Set<string>(),
            removed.get(targetId) ?? new Set<string>()
        );

        if (!areBackLinksEqual(doc.backLinks, nextBackLinks)) {
            patches.push({
                id: targetId,
                data: { backLinks: nextBackLinks },
            });
        }
    }

    if (patches.length === 0) {
        return;
    }

    const results = await db.bulkPatchDocuments(patches);
    const failed = results.filter((result) => !('ok' in result && result.ok));
    if (failed.length > 0) {
        useErrorStore.getState().dispatchError(
            `Backlink reconciliation failed for ${failed.length} target entr${failed.length === 1 ? 'y' : 'ies'}.`,
            'error'
        );
        throw new Error('Backlink reconciliation failed due to bulk patch errors.');
    }
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
    profileId: string,
    encryptionKey?: CryptoKey
): Promise<string> {
    try {
        const schema = await get_schema(db, schemaId);
        const validatedData = validateEntryAgainstSchema(data, schema);
        const sourceTargets = extractRelationTargets(validatedData, schema);

        const entryData: Omit<LedgerEntry, keyof LedgyDocument> = {
            schemaId,
            ledgerId,
            profileId,
            data: validatedData,
        };

        if (encryptionKey) {
            // Zero-knowledge sync: Encrypt payload before storage
            const result = await encryptPayload(encryptionKey, JSON.stringify(validatedData));
            entryData.data_enc = {
                iv: result.iv,
                ciphertext: Array.from(new Uint8Array(result.ciphertext))
            };
            // Keep an empty data object for type compatibility
            entryData.data = {};
        }

        const response = await db.createDocument<LedgerEntry>('entry', entryData);

        if (!response.ok) {
            throw new Error('Failed to create entry document');
        }

        try {
            await reconcileBackLinksForSource(
                db,
                {
                    sourceEntryId: response.id,
                    sourceSchemaId: schemaId,
                    sourceLedgerId: ledgerId,
                },
                new Map(),
                sourceTargets
            );
        } catch (reconcileError) {
            try {
                await db.hardDeleteDocument(response.id);
            } catch (rollbackError) {
                useErrorStore.getState().dispatchError(
                    `Entry rollback failed after backlink reconciliation error: ${response.id}`,
                    'error'
                );
                throw rollbackError;
            }
            throw reconcileError;
        }

        return response.id;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create entry';
        useErrorStore.getState().dispatchError(message, 'error');
        throw error;
    }
}

/**
 * Updates an existing ledger entry document.
 * @param db - Profile database instance
 * @param entryId - Entry document ID
 * @param data - Updated entry data
 * @param encryptionKey - Optional AES-GCM encryption key
 */
export async function update_entry(
    db: Database,
    entryId: string,
    data: Record<string, unknown>,
    encryptionKey?: CryptoKey
): Promise<void> {
    try {
        const existingEntry = await get_entry(db, entryId);
        const schema = await get_schema(db, existingEntry.schemaId);
        const previousData = await getRelationDataForEntry(existingEntry, encryptionKey);
        const previousTargets = existingEntry.isDeleted
            ? new Map<string, Set<string>>()
            : extractRelationTargets(previousData, schema);

        const validatedData = validateEntryAgainstSchema(data, schema);
        const nextTargets = existingEntry.isDeleted
            ? new Map<string, Set<string>>()
            : extractRelationTargets(validatedData, schema);

        try {
            if (encryptionKey) {
                const result = await encryptPayload(encryptionKey, JSON.stringify(validatedData));
                await db.updateDocument(entryId, {
                    data_enc: {
                        iv: result.iv,
                        ciphertext: Array.from(new Uint8Array(result.ciphertext))
                    },
                    data: {}
                });
            } else {
                await db.updateDocument(entryId, { data: validatedData });
            }

            await reconcileBackLinksForSource(
                db,
                {
                    sourceEntryId: existingEntry._id,
                    sourceSchemaId: existingEntry.schemaId,
                    sourceLedgerId: existingEntry.ledgerId,
                },
                previousTargets,
                nextTargets
            );
        } catch (reconcileError) {
            try {
                await db.updateDocument(entryId, {
                    data: existingEntry.data,
                    data_enc: existingEntry.data_enc,
                    isDeleted: existingEntry.isDeleted,
                    deletedAt: existingEntry.deletedAt,
                });
            } catch {
                useErrorStore.getState().dispatchError(
                    `Entry rollback failed after backlink reconciliation error: ${entryId}`,
                    'error'
                );
            }
            throw reconcileError;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update entry';
        useErrorStore.getState().dispatchError(message, 'error');
        throw error;
    }
}

/**
 * Non-exported helper: writes a migrated entry back to PouchDB.
 * Non-fatal: logs a warning on failure but does not rethrow.
 * NFR9 JIT migration write-back.
 */
async function persistMigratedEntry(
    db: Database,
    entry: LedgerEntry,
    newSchemaVersion: number,
    encryptionKey?: CryptoKey
): Promise<void> {
    try {
        if (encryptionKey) {
            const result = await encryptPayload(encryptionKey, JSON.stringify(entry.data));
            await db.updateDocument(entry._id, {
                data_enc: { iv: result.iv, ciphertext: Array.from(new Uint8Array(result.ciphertext)) },
                data: {},
                schema_version: newSchemaVersion,
            });
        } else {
            await db.updateDocument(entry._id, { data: entry.data, schema_version: newSchemaVersion });
        }
    } catch (error) {
        console.warn('Migration write-back failed for entry', entry._id, error);
    }
}

/**
 * Lists all entries for a specific ledger/schema.
 * Filters out soft-deleted entries by default.
 * Applies JIT migration to every returned entry (AC #7, #9).
 * @param db - Profile database instance
 * @param ledgerId - Ledger identifier to filter by
 * @returns Array of entry documents (excluding soft-deleted)
 */
export async function list_entries(
    db: Database,
    ledgerId: string,
    encryptionKey?: CryptoKey
): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    const filtered = entryDocs.filter(doc => !doc.isDeleted && doc.ledgerId === ledgerId);
    const decrypted = encryptionKey ? await decryptLedgerEntries(filtered, encryptionKey) : filtered;
    const schema = await get_schema(db, ledgerId).catch(() => null);
    if (!schema) return decrypted;
    const result: LedgerEntry[] = [];
    const writeBackPromises: Promise<void>[] = [];
    for (const entry of decrypted) {
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        if (didMigrate) writeBackPromises.push(persistMigratedEntry(db, migrated, schema.schema_version, encryptionKey));
        result.push(migrated);
    }
    await Promise.all(writeBackPromises);
    return result;
}

/**
 * Lists all entries for a specific ledger/schema including soft-deleted entries.
 * Used for ghost reference detection.
 * Applies JIT migration to every returned entry (AC #8, #9).
 * Write-back is skipped for soft-deleted entries — they are returned migrated in-memory only.
 * @param db - Profile database instance
 * @param ledgerId - Ledger identifier to filter by
 * @param encryptionKey - Optional encryption key
 * @returns Array of all entry documents (including soft-deleted)
 */
export async function list_all_entries(
    db: Database,
    ledgerId: string,
    encryptionKey?: CryptoKey
): Promise<LedgerEntry[]> {
    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    const filtered = entryDocs.filter(doc => doc.ledgerId === ledgerId);
    const decrypted = encryptionKey ? await decryptLedgerEntries(filtered, encryptionKey) : filtered;
    const schema = await get_schema(db, ledgerId).catch(() => null);
    if (!schema) return decrypted;
    const result: LedgerEntry[] = [];
    const writeBackPromises: Promise<void>[] = [];
    for (const entry of decrypted) {
        const { migrated, didMigrate } = migrateEntryData(entry, schema);
        if (didMigrate && !entry.isDeleted) writeBackPromises.push(persistMigratedEntry(db, migrated, schema.schema_version, encryptionKey));
        result.push(migrated);
    }
    await Promise.all(writeBackPromises);
    return result;
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
    targetEntryId: string,
    encryptionKey?: CryptoKey
): Promise<LedgerEntry[]> {
    const targetEntry = await db.getDocument<LedgerEntry>(targetEntryId);
    if (targetEntry?.backLinks?.length) {
        const sourceIds = [...new Set(targetEntry.backLinks.map((backLink) => backLink.sourceEntryId))];
        const sourceEntriesRaw = await Promise.all(
            sourceIds.map((sourceId) => db.getDocument<LedgerEntry>(sourceId))
        );
        const sourceEntries: LedgerEntry[] = [];
        for (const entry of sourceEntriesRaw) {
            if (entry && !entry.isDeleted) {
                sourceEntries.push(entry);
            }
        }

        if (sourceEntries.length > 0) {
            return encryptionKey
                ? await decryptLedgerEntries(sourceEntries, encryptionKey)
                : sourceEntries;
        }
    }

    const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
    const activeEntries = entryDocs.filter((doc) => !doc.isDeleted);
    const decryptedDocs = encryptionKey
        ? await decryptLedgerEntries(activeEntries, encryptionKey)
        : activeEntries;

    const relationFieldsBySchemaId = new Map<string, Set<string>>();
    const schemaIds = [...new Set(decryptedDocs.map((doc) => doc.schemaId))];
    await Promise.all(
        schemaIds.map(async (schemaId) => {
            try {
                const schema = await get_schema(db, schemaId);
                relationFieldsBySchemaId.set(schemaId, new Set(getRelationFieldNames(schema)));
            } catch {
                relationFieldsBySchemaId.set(schemaId, new Set());
            }
        })
    );

    return decryptedDocs.filter((doc) => {
        const relationFields = relationFieldsBySchemaId.get(doc.schemaId) ?? new Set<string>();
        for (const fieldName of relationFields) {
            const value = doc.data[fieldName];
            if (Array.isArray(value) && value.includes(targetEntryId)) {
                return true;
            }
            if (value === targetEntryId) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Helper to decrypt a batch of ledger entries.
 */
export async function decryptLedgerEntries(
    entries: LedgerEntry[],
    encryptionKey: CryptoKey
): Promise<LedgerEntry[]> {
    const result: LedgerEntry[] = [];
    for (const entry of entries) {
        result.push(await decryptLedgerEntry(entry, encryptionKey));
    }
    return result;
}

/**
 * Helper to decrypt a single ledger entry.
 */
export async function decryptLedgerEntry(
    entry: LedgerEntry,
    encryptionKey: CryptoKey
): Promise<LedgerEntry> {
    if (entry.data_enc) {
        try {
            const iv = new Uint8Array(entry.data_enc.iv);
            const ciphertext = new Uint8Array(entry.data_enc.ciphertext).buffer;
            const decryptedJson = await decryptPayload(encryptionKey, iv, ciphertext);
            return {
                ...entry,
                data: JSON.parse(decryptedJson)
            };
        } catch (e) {
            console.error('Failed to decrypt entry:', entry._id, e);
            return {
                ...entry,
                data: { error: 'Decryption failed' }
            };
        }
    }
    return entry;
}

/**
 * Soft-deletes an entry (Ghost Reference pattern - NFR4, NFR10).
 * @param db - Profile database instance
 * @param entryId - Entry document ID
 */
export async function delete_entry(
    db: Database,
    entryId: string,
    encryptionKey?: CryptoKey
): Promise<void> {
    try {
        const entry = await get_entry(db, entryId);
        const schema = await get_schema(db, entry.schemaId);
        const sourceTargets = extractRelationTargets(
            await getRelationDataForEntry(entry, encryptionKey),
            schema
        );

        try {
            await db.updateDocument(entryId, {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
            });

            await reconcileBackLinksForSource(
                db,
                {
                    sourceEntryId: entry._id,
                    sourceSchemaId: entry.schemaId,
                    sourceLedgerId: entry.ledgerId,
                },
                sourceTargets,
                new Map()
            );
        } catch (reconcileError) {
            try {
                await db.updateDocument(entryId, {
                    isDeleted: entry.isDeleted,
                    deletedAt: entry.deletedAt,
                });
            } catch {
                useErrorStore.getState().dispatchError(
                    `Entry rollback failed after backlink reconciliation error: ${entryId}`,
                    'error'
                );
            }
            throw reconcileError;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete entry';
        useErrorStore.getState().dispatchError(message, 'error');
        throw error;
    }
}

/**
 * Restores a soft-deleted entry by unsetting isDeleted and deletedAt flags.
 * @param db - Profile database instance
 * @param entryId - Entry document ID to restore
 */
export async function restore_entry(
    db: Database,
    entryId: string,
    encryptionKey?: CryptoKey
): Promise<void> {
    try {
        const entry = await get_entry(db, entryId);
        const schema = await get_schema(db, entry.schemaId);
        const sourceTargets = extractRelationTargets(
            await getRelationDataForEntry(entry, encryptionKey),
            schema
        );

        try {
            await db.updateDocument(entryId, {
                isDeleted: false,
                deletedAt: undefined,
            });

            await reconcileBackLinksForSource(
                db,
                {
                    sourceEntryId: entry._id,
                    sourceSchemaId: entry.schemaId,
                    sourceLedgerId: entry.ledgerId,
                },
                new Map(),
                sourceTargets
            );
        } catch (reconcileError) {
            try {
                await db.updateDocument(entryId, {
                    isDeleted: entry.isDeleted,
                    deletedAt: entry.deletedAt,
                });
            } catch {
                useErrorStore.getState().dispatchError(
                    `Entry rollback failed after backlink reconciliation error: ${entryId}`,
                    'error'
                );
            }
            throw reconcileError;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to restore entry';
        useErrorStore.getState().dispatchError(message, 'error');
        throw error;
    }
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
    profileId: string,
    encryptionKey?: CryptoKey
): Promise<string> {
    const canvasDocId = `canvas:${canvasId}`;
    const canvasData: any = {
        viewport,
        profileId,
        canvasId,
    };

    if (encryptionKey) {
        const nodesResult = await encryptPayload(encryptionKey, JSON.stringify(nodes));
        canvasData.nodes_enc = {
            iv: nodesResult.iv,
            ciphertext: Array.from(new Uint8Array(nodesResult.ciphertext))
        };

        const edgesResult = await encryptPayload(encryptionKey, JSON.stringify(edges));
        canvasData.edges_enc = {
            iv: edgesResult.iv,
            ciphertext: Array.from(new Uint8Array(edgesResult.ciphertext))
        };
        canvasData.nodes = [];
        canvasData.edges = [];
    } else {
        canvasData.nodes = nodes;
        canvasData.edges = edges;
    }

    try {
        // Try to get existing canvas
        await db.getDocument<NodeCanvas>(canvasDocId);
        await db.updateDocument(canvasDocId, canvasData);
        return canvasDocId;
    } catch (e: any) {
        if (e.status === 404) {
            // Canvas doesn't exist, create it
            const response = await db.createDocument<NodeCanvas>('canvas', canvasData);
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
    canvasId: string,
    encryptionKey?: CryptoKey
): Promise<NodeCanvas | null> {
    try {
        const doc = await db.getDocument<NodeCanvas>(`canvas:${canvasId}`);

        if (encryptionKey) {
            if (doc.nodes_enc) {
                const iv = new Uint8Array(doc.nodes_enc.iv);
                const ciphertext = new Uint8Array(doc.nodes_enc.ciphertext).buffer;
                const nodesJson = await decryptPayload(encryptionKey, iv, ciphertext);
                doc.nodes = JSON.parse(nodesJson);
            }
            if (doc.edges_enc) {
                const iv = new Uint8Array(doc.edges_enc.iv);
                const ciphertext = new Uint8Array(doc.edges_enc.ciphertext).buffer;
                const edgesJson = await decryptPayload(encryptionKey, iv, ciphertext);
                doc.edges = JSON.parse(edgesJson);
            }
        }
        return doc;
    } catch (e: any) {
        if (e.status === 404) return null;
        throw e;
    }
}

// ============================================================================
// Dashboard Layout Functions (Story 4-5)
// ============================================================================

import { WidgetConfig, DashboardLayout } from '../types/dashboard';

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
    profileId: string,
    encryptionKey?: CryptoKey
): Promise<string> {
    const dashboardDocId = `dashboard:${dashboardId}`;
    const dashboardData: any = {
        profileId,
        dashboardId,
        layout: {
            columns: 4,
            rows: 10,
        },
    };

    if (encryptionKey) {
        const result = await encryptPayload(encryptionKey, JSON.stringify(widgets));
        dashboardData.widgets_enc = {
            iv: result.iv,
            ciphertext: Array.from(new Uint8Array(result.ciphertext))
        };
        dashboardData.widgets = [];
    } else {
        dashboardData.widgets = widgets;
    }

    try {
        // Try to get existing dashboard
        await db.getDocument<DashboardLayout>(dashboardDocId);
        await db.updateDocument(dashboardDocId, dashboardData);
        return dashboardDocId;
    } catch (e: any) {
        if (e.status === 404) {
            // Dashboard doesn't exist, create it
            const response = await db.createDocument<DashboardLayout>('dashboard', dashboardData);
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
    dashboardId: string,
    encryptionKey?: CryptoKey
): Promise<DashboardLayout | null> {
    try {
        const doc = await db.getDocument<DashboardLayout>(`dashboard:${dashboardId}`);
        if (encryptionKey && doc.widgets_enc) {
            const iv = new Uint8Array(doc.widgets_enc.iv);
            const ciphertext = new Uint8Array(doc.widgets_enc.ciphertext).buffer;
            const widgetsJson = await decryptPayload(encryptionKey, iv, ciphertext);
            doc.widgets = JSON.parse(widgetsJson);
        }
        return doc;
    } catch (e: any) {
        if (e.status === 404) return null;
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
                schema_version: 1,
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

            // Enforce HTTPS for Basic Authentication (allow local networks for self-hosted sync)
            if (url.protocol !== 'https:' && !isLocalNetwork(url.hostname)) {
                throw new Error('Insecure connection: HTTPS is required for authenticated remote sync operations.');
            }

            url.username = config.username;
            url.password = config.password;
            remoteUrl = url.toString();
        } catch (e: any) {
            if (e.message.includes('Insecure connection')) {
                throw e; // Rethrow security error
            }
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
