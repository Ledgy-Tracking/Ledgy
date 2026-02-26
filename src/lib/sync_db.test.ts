import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getProfileDb, _clearProfileDatabases, save_sync_config, get_sync_config } from './db';
import PouchDB from 'pouchdb';
import { SyncConfig } from '../types/sync';

describe('Sync Database Operations', () => {
    const profileId = 'test-sync-profile';
    let encryptionKey: CryptoKey;

    beforeEach(async () => {
        const db = new PouchDB(`ledgy_profile_${profileId}`, { adapter: 'memory' });
        await db.destroy();
        _clearProfileDatabases();

        // Generate a test key
        encryptionKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    });

    afterAll(async () => {
        const db = new PouchDB(`ledgy_profile_${profileId}`, { adapter: 'memory' });
        await db.destroy();
        _clearProfileDatabases();
    });

    it('should save and load encrypted sync configuration', async () => {
        const db = getProfileDb(profileId);
        const config: Partial<SyncConfig> = {
            remoteUrl: 'http://localhost:5984/testdb',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // This should fail initially because save_sync_config is not implemented
        await save_sync_config(db, profileId, config, encryptionKey);

        const loadedConfig = await get_sync_config(db, profileId, encryptionKey);

        expect(loadedConfig).toBeDefined();
        expect(loadedConfig?.remoteUrl).toBe(config.remoteUrl);
        expect(loadedConfig?.username).toBe(config.username);
        expect(loadedConfig?.password).toBe(config.password);
        expect(loadedConfig?.syncDirection).toBe(config.syncDirection);
        expect(loadedConfig?.continuous).toBe(config.continuous);
        expect(loadedConfig?.type).toBe('sync_config');
    });
});
