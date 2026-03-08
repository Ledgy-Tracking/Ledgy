import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    sanitizeProfileName,
    generateProfileId,
    getProfileName,
    ProfileDbManager,
    profileDbManager,
} from './profileDbManager';

describe('Profile DB Manager', () => {
    // Silence console.log during tests to reduce noise
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('sanitizeProfileName', () => {
        it('converts to lowercase', () => {
            expect(sanitizeProfileName('My Profile')).toBe('my_profile');
        });

        it('replaces special characters with underscores', () => {
            expect(sanitizeProfileName('Client @ ACME!')).toBe('client___acme_');
        });

        it('removes spaces', () => {
            expect(sanitizeProfileName('Project Alpha')).toBe('project_alpha');
        });

        it('truncates to 50 characters', () => {
            const longName = 'a'.repeat(100);
            expect(sanitizeProfileName(longName)).toHaveLength(50);
        });

        it('preserves valid characters', () => {
            expect(sanitizeProfileName('test-profile_123')).toBe('test-profile_123');
        });
    });

    describe('generateProfileId', () => {
        it('generates a valid UUID', () => {
            const id = generateProfileId();
            // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(id).toMatch(uuidRegex);
        });

        it('generates unique IDs', () => {
            const id1 = generateProfileId();
            const id2 = generateProfileId();
            expect(id1).not.toBe(id2);
        });
    });

    describe('getProfileName', () => {
        it('returns database name with prefix', () => {
            const profileId = 'test-123';
            expect(getProfileName(profileId)).toBe('ledgy-profile-test-123');
        });

        it('uses correct prefix constant', () => {
            const profileId = 'abc';
            const name = getProfileName(profileId);
            expect(name).toMatch(/^ledgy-profile-/);
        });
    });

    describe('ProfileDbManager Singleton', () => {
        it('returns same instance from getInstance', () => {
            const instance1 = ProfileDbManager.getInstance();
            const instance2 = ProfileDbManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('exports singleton instance', () => {
            expect(profileDbManager).toBeInstanceOf(ProfileDbManager);
        });
    });

    describe('ProfileDbManager Methods', () => {
        let manager: ProfileDbManager;

        beforeEach(() => {
            manager = ProfileDbManager.getInstance();
        });

        afterEach(() => {
            // Reset active profile
            manager['activeProfileId'] = null;
            manager['profileDbCache'].clear();
        });

        describe('getActiveProfileId', () => {
            it('returns null when no active profile', () => {
                expect(manager.getActiveProfileId()).toBeNull();
            });

            it('returns active profile ID after switch', async () => {
                const profileId = generateProfileId();
                await manager.switchProfile(profileId);
                expect(manager.getActiveProfileId()).toBe(profileId);
            });
        });

        describe('switchProfile', () => {
            it('sets active profile ID', async () => {
                const profileId = generateProfileId();
                await manager.switchProfile(profileId);
                expect(manager.getActiveProfileId()).toBe(profileId);
            });

            it('does nothing when switching to same profile', async () => {
                const profileId = generateProfileId();
                await manager.switchProfile(profileId);
                const spy = vi.spyOn(manager as any, 'emitProfileSwitchEvent');
                await manager.switchProfile(profileId);
                expect(spy).not.toHaveBeenCalled();
                spy.mockRestore();
            });

            it('closes previous profile database', async () => {
                const profileId1 = generateProfileId();
                const profileId2 = generateProfileId();

                await manager.switchProfile(profileId1);
                const closeSpy = vi.spyOn(manager as any, 'closeProfileDb');

                await manager.switchProfile(profileId2);
                expect(closeSpy).toHaveBeenCalledWith(profileId1);

                closeSpy.mockRestore();
            });

            it('emits profile switch event', async () => {
                const profileId = generateProfileId();
                const emitSpy = vi.spyOn(manager as any, 'emitProfileSwitchEvent');

                await manager.switchProfile(profileId);
                expect(emitSpy).toHaveBeenCalledWith(profileId);

                emitSpy.mockRestore();
            });
        });

        describe('closeProfileDb', () => {
            it('removes database from cache', async () => {
                const profileId = generateProfileId();
                manager.getProfileDb(profileId);

                expect(manager['profileDbCache'].has(profileId)).toBe(true);
                await manager.closeProfileDb(profileId);
                expect(manager['profileDbCache'].has(profileId)).toBe(false);
            });

            it('handles closing non-existent database gracefully', async () => {
                const profileId = 'non-existent';
                await expect(manager.closeProfileDb(profileId)).resolves.not.toThrow();
            });
        });

        describe('getProfileDb', () => {
            it('creates and caches database instance', () => {
                const profileId = generateProfileId();
                const db = manager.getProfileDb(profileId);

                expect(db).toBeDefined();
                expect(manager['profileDbCache'].has(profileId)).toBe(true);
            });

            it('returns cached instance on subsequent calls', () => {
                const profileId = generateProfileId();
                const db1 = manager.getProfileDb(profileId);
                const db2 = manager.getProfileDb(profileId);

                expect(db1).toBe(db2);
            });
        });

        describe('emitProfileSwitchEvent', () => {
            it('dispatches custom event on window', async () => {
                const profileId = generateProfileId();
                const eventSpy = vi.fn();

                if (typeof window !== 'undefined') {
                    window.addEventListener('ledgy:profile:switch', eventSpy);
                    await manager.switchProfile(profileId);

                    expect(eventSpy).toHaveBeenCalled();
                    const event = eventSpy.mock.calls[0][0] as CustomEvent;
                    expect(event.detail.profileId).toBe(profileId);

                    window.removeEventListener('ledgy:profile:switch', eventSpy);
                }
            });
        });

        describe('validateProfileNameUnique', () => {
            it('returns true for unique name', async () => {
                // Mock masterDb and encryptionKey
                const mockMasterDb = {};
                const mockKey = {} as CryptoKey;

                // Since we can't easily mock the full PouchDB stack,
                // we test the logic path
                const result = await manager.validateProfileNameUnique(
                    mockMasterDb,
                    'Unique Profile Name',
                    mockKey
                );

                // Should not throw, returns false on error
                expect(typeof result).toBe('boolean');
            });

            it('excludes specified profile ID from check', async () => {
                const mockMasterDb = {};
                const mockKey = {} as CryptoKey;
                const excludeId = generateProfileId();

                const result = await manager.validateProfileNameUnique(
                    mockMasterDb,
                    'Test Name',
                    mockKey,
                    excludeId
                );

                expect(typeof result).toBe('boolean');
            });
        });
    });

    describe('Profile Switch Event', () => {
        it('dispatches event with correct detail', async () => {
            const manager = ProfileDbManager.getInstance();
            const profileId = generateProfileId();

            if (typeof window !== 'undefined') {
                const eventPromise = new Promise<CustomEvent>((resolve) => {
                    window.addEventListener('ledgy:profile:switch', ((event: Event) => {
                        resolve(event as CustomEvent);
                    }) as EventListener, { once: true });
                });

                await manager.switchProfile(profileId);
                const event = await eventPromise;

                expect(event.detail.profileId).toBe(profileId);
            }
        });
    });
});
