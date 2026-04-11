import { describe, it, expect } from 'vitest';
import { setup_sync } from '../src/lib/db';
import { deleteRemoteDatabase } from '../src/services/syncService';
import PouchDB from 'pouchdb';
import { SyncConfig } from '../src/types/sync';

describe('Sync Security Validation', () => {
    it('throws error when setting up sync with insecure HTTP and Basic Auth (non-localhost)', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://example.com/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        expect(() => setup_sync('test-profile', config)).toThrow(/Insecure Connection: Remote URL must use HTTPS/);
    });

    it('allows setup_sync with HTTP on localhost', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://localhost:5984/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // Should not throw security error
        try {
            setup_sync('test-profile', config);
        } catch (e: any) {
            expect(e.message).not.toMatch(/Insecure connection/);
        }
    });

    it('allows setup_sync with HTTP on local networks (192.168.x.x)', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://192.168.1.100:5984/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // Should not throw security error
        try {
            setup_sync('test-profile', config);
        } catch (e: any) {
            expect(e.message).not.toMatch(/Insecure connection/);
        }
    });

    it('allows setup_sync with HTTP on local networks (10.x.x.x)', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://10.0.0.5:5984/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // Should not throw security error
        try {
            setup_sync('test-profile', config);
        } catch (e: any) {
            expect(e.message).not.toMatch(/Insecure connection/);
        }
    });

    it('allows setup_sync with HTTP on local networks (.local)', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://raspberrypi.local:5984/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // Should not throw security error
        try {
            setup_sync('test-profile', config);
        } catch (e: any) {
            expect(e.message).not.toMatch(/Insecure connection/);
        }
    });

    it('throws error when deleting remote database with insecure HTTP and Basic Auth', async () => {
        const remoteConfig = {
            url: 'http://example.com/db',
            username: 'admin',
            password: 'password123',
        };

        await expect(deleteRemoteDatabase(remoteConfig)).rejects.toThrow(/insecure/i);
    });
});

    it('allows setup_sync with HTTP on local networks (IPv6 loopback)', () => {
        const config: SyncConfig = {
            remoteUrl: 'http://[::1]:5984/db',
            username: 'admin',
            password: 'password123',
            syncDirection: 'two-way',
            continuous: true
        };

        // Should not throw security error
        try {
            setup_sync('test-profile', config);
        } catch (e: any) {
            expect(e.message).not.toMatch(/Insecure connection/);
        }
    });
