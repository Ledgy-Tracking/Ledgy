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
