/**
 * Profile metadata for display in UI components
 * 
 * @remarks
 * - `color` and `avatar` are user-provided during profile creation (Story 2-3)
 * - `lastOpened` is updated automatically when profile is selected
 * - If `avatar` is not provided, first letter of `name` is used
 * - If `color` is not provided, default gray is used
 */
export interface ProfileMetadata {
    id: string;
    name: string;
    description?: string;
    createdAt: string | number;
    updatedAt: string | number;
    lastOpened?: number; // Unix timestamp for last opened time
    color?: string; // Tailwind CSS color class for avatar background (e.g., 'bg-blue-500')
    avatar?: string; // Initials or icon to display in avatar circle
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
    type: string; // "profile" | "project" | "entry" | "schema" | "node"
    schemaVersion: number;
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
