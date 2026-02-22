export interface ProfileMetadata {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    remoteSyncEndpoint?: string;
}

/**
 * Encrypted profile metadata as stored in PouchDB.
 * Name and description are encrypted using AES-GCM.
 */
export interface EncryptedProfileMetadata {
    iv: number[];
    ciphertext: number[];
}

export interface LedgyDocument {
    _id: string; // "{type}:{uuid}"
    _rev?: string;
    type: string; // "profile" | "entry" | "schema" | "node"
    schema_version: number;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    deletedAt?: string; // Ghost Reference soft-delete
    isDeleted?: boolean;
}

export interface ProfileDocument extends LedgyDocument {
    type: 'profile';
    name: string;
    description?: string;
    remoteSyncEndpoint?: string;
}
