import PouchDB from 'pouchdb';
import { v4 as uuidv4 } from 'uuid';
import { LedgyDocument } from '../types/profile';

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
 * Internal helper to clear the registry (mainly for tests).
 */
export function _clearProfileDatabases() {
    profileDatabases = {};
}
