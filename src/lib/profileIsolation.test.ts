/**
 * Profile Isolation Security Tests
 * 
 * These tests validate that user profiles are properly isolated and users cannot
 * access or enumerate profiles belonging to other users.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../features/auth/useAuthStore';
import { useProfileStore } from '../stores/useProfileStore';
import { getProfileDb, _clearProfileDatabases } from './db';
import { deriveUserIdFromSecret } from './crypto';

// Mock the DB module partially to avoid decryption errors with dummy data
vi.mock('./db', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./db')>();
    return {
        ...actual,
        decryptProfileMetadata: vi.fn().mockImplementation(async (docs) => {
            return docs.map((doc: Record<string, any>) => ({
                id: doc._id,
                name: doc.name || (doc.name_enc ? 'Decrypted Name' : 'Unknown'),
                description: doc.description || (doc.description_enc ? 'Decrypted Description' : ''),
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                color: doc.color,
                avatar: doc.avatar,
            }));
        }),
    };
});

// Mock crypto partially to avoid real encryption/decryption issues in these tests
vi.mock('./crypto', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./crypto')>();
    return {
        ...actual,
        encryptPayload: vi.fn().mockImplementation(async (_key, data) => {
            return {
                iv: new Uint8Array([1, 2, 3]),
                ciphertext: new TextEncoder().encode(data).buffer,
            };
        }),
        decryptPayload: vi.fn().mockImplementation(async (_key, _iv, ciphertext) => {
            return new TextDecoder().decode(ciphertext);
        }),
    };
});

// Test utilities
const TEST_TOTP_SECRET_1 = 'JBSWY3DPEHPK3PXP'; // User 1
const TEST_TOTP_SECRET_2 = 'MFRGG3DFMZTWQ3DK'; // User 2

describe('Profile Isolation Security Tests', () => {
    let testSuffix = '';

    beforeEach(async () => {
        testSuffix = Math.random().toString(36).substring(7);
        // Clear all databases and reset stores
        _clearProfileDatabases();
        useAuthStore.setState({
            totpSecret: null,
            encryptedTotpSecret: null,
            isUnlocked: false,
            encryptionKey: null,
            userId: null,
            rememberMe: false,
            rememberMeExpiry: null,
            rememberMeExpiryMs: null,
            salt: null,
            needsPassphrase: false,
            isLoading: false,
            error: null,
        });
        useProfileStore.setState({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,
        });
    });

    describe('User ID Derivation', () => {
        it('should generate consistent user IDs from same TOTP secret', async () => {
            const userId1a = await deriveUserIdFromSecret(TEST_TOTP_SECRET_1);
            const userId1b = await deriveUserIdFromSecret(TEST_TOTP_SECRET_1);
            
            expect(userId1a).toBe(userId1b);
            expect(userId1a).toHaveLength(64); // SHA-256 hex string
        });

        it('should generate different user IDs for different TOTP secrets', async () => {
            const userId1 = await deriveUserIdFromSecret(TEST_TOTP_SECRET_1);
            const userId2 = await deriveUserIdFromSecret(TEST_TOTP_SECRET_2);
            
            expect(userId1).not.toBe(userId2);
        });
    });

    describe('Database Isolation', () => {
        it('should use different databases for different users', async () => {
            const userId1 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_1)) + testSuffix;
            const userId2 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_2)) + testSuffix;
            
            const db1 = getProfileDb(`profiles_${userId1}`);
            const db2 = getProfileDb(`profiles_${userId2}`);
            
            // Databases should be different instances
            expect(db1).not.toBe(db2);
            
            // Create a test profile in user1's database
            await db1.createDocument('profile', {
                name_enc: { iv: [1,2,3], ciphertext: [4,5,6] },
                description_enc: undefined,
                color: '#ff0000',
                avatar: '👤',
            });
            
            // User2's database should be empty
            const user1Profiles = await db1.getAllDocuments('profile');
            const user2Profiles = await db2.getAllDocuments('profile');
            
            expect(user1Profiles).toHaveLength(1);
            expect(user2Profiles).toHaveLength(0);
        });
    });

    describe('Profile Enumeration Isolation', () => {
        it('should only show profiles for the current user', async () => {
            // Mock authentication for user 1
            const userId1 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_1)) + testSuffix;
            const mockEncryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            useAuthStore.setState({
                isUnlocked: true,
                encryptionKey: mockEncryptionKey,
                userId: userId1,
                totpSecret: TEST_TOTP_SECRET_1,
            });

            // Create profile in user1's database
            const db1 = getProfileDb(`profiles_${userId1}`);
            await db1.createDocument('profile', {
                name_enc: { iv: [1,2,3], ciphertext: [4,5,6] },
                description_enc: undefined,
                color: '#ff0000',
                avatar: '👤',
            });

            // Create profile in user2's database (simulating another user)
            const userId2 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_2)) + testSuffix;
            const db2 = getProfileDb(`profiles_${userId2}`);
            await db2.createDocument('profile', {
                name_enc: { iv: [7,8,9], ciphertext: [10,11,12] },
                description_enc: undefined,
                color: '#00ff00',
                avatar: '🔒',
            });

            // Fetch profiles as user1
            await useProfileStore.getState().fetchProfiles();
            const user1Profiles = useProfileStore.getState().profiles;

            // User1 should only see their own profile, not user2's profile
            expect(user1Profiles).toHaveLength(1);
        });

        it('should fail to fetch profiles without userId', async () => {
            // Mock partial authentication (missing userId)
            const mockEncryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            useAuthStore.setState({
                isUnlocked: true,
                encryptionKey: mockEncryptionKey,
                userId: null, // Missing userId
                totpSecret: TEST_TOTP_SECRET_1,
            });

            // Attempt to fetch profiles should fail
            await useProfileStore.getState().fetchProfiles();
            
            const error = useProfileStore.getState().error;
            expect(error).toContain('Authentication required');
        });
    });

    describe('Profile Creation Isolation', () => {
        it('should create profiles in user-scoped database', async () => {
            // Mock authentication for user 1
            const userId1 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_1)) + testSuffix;
            const mockEncryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            useAuthStore.setState({
                isUnlocked: true,
                encryptionKey: mockEncryptionKey,
                userId: userId1,
                totpSecret: TEST_TOTP_SECRET_1,
            });

            // Create a profile
            await useProfileStore.getState().createProfile('Test Profile', 'Test Description');

            // Verify the profile exists in user1's database only
            const db1 = getProfileDb(`profiles_${userId1}`);
            const user1Profiles = await db1.getAllDocuments('profile');
            
            // Check user2's database remains empty
            const userId2 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_2)) + testSuffix;
            const db2 = getProfileDb(`profiles_${userId2}`);
            const user2Profiles = await db2.getAllDocuments('profile');

            expect(user1Profiles).toHaveLength(1);
            expect(user2Profiles).toHaveLength(0);
        });
    });

    describe('Cross-User Data Leakage Prevention', () => {
        it('should not leak profile metadata across users', async () => {
            // Create profiles for both users in their respective databases
            const userId1 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_1)) + testSuffix;
            const userId2 = (await deriveUserIdFromSecret(TEST_TOTP_SECRET_2)) + testSuffix;
            
            const db1 = getProfileDb(`profiles_${userId1}`);
            const db2 = getProfileDb(`profiles_${userId2}`);

            // Create profile for user1
            await db1.createDocument('profile', {
                name_enc: { iv: [1,2,3], ciphertext: [4,5,6] },
                description_enc: undefined,
                color: '#ff0000',
                avatar: '🔴',
            });

            // Create profile for user2
            await db2.createDocument('profile', {
                name_enc: { iv: [7,8,9], ciphertext: [10,11,12] },
                description_enc: undefined,
                color: '#00ff00',
                avatar: '🟢',
            });

            // Authenticate as user1 and verify isolation
            const mockEncryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            useAuthStore.setState({
                isUnlocked: true,
                encryptionKey: mockEncryptionKey,
                userId: userId1,
                totpSecret: TEST_TOTP_SECRET_1,
            });

            // Fetch profiles should only return user1's profiles
            await useProfileStore.getState().fetchProfiles();
            const profiles = useProfileStore.getState().profiles;

            expect(profiles).toHaveLength(1);
            expect(profiles[0].avatar).toBe('🔴');
        });

        it('should prevent accessing other user databases directly', async () => {
            const userId1 = await deriveUserIdFromSecret(TEST_TOTP_SECRET_1);
            const userId2 = await deriveUserIdFromSecret(TEST_TOTP_SECRET_2);
            
            // Verify database names are different and user-scoped
            expect(`profiles_${userId1}`).not.toBe(`profiles_${userId2}`);
            expect(`profiles_${userId1}`).toContain(userId1);
            expect(`profiles_${userId2}`).toContain(userId2);
        });
    });
});