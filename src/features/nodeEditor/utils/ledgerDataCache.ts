/**
 * Cache entry for ledger data
 */
interface CacheEntry {
    data: any;
    timestamp: number;
    schemaVersion: number;
    size: number; // Estimated memory size
}

/**
 * Ledger data cache for performance optimization
 * Implements LRU eviction and schema-based invalidation
 */
export class LedgerDataCache {
    private cache = new Map<string, CacheEntry>();
    private maxSize: number;
    private maxEntries: number;
    private currentSize = 0;

    constructor(maxSizeMB: number = 50, maxEntries: number = 1000) {
        this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
        this.maxEntries = maxEntries;
    }

    /**
     * Generate cache key for ledger data
     */
    private getCacheKey(ledgerId: string, schemaSnapshot: any[]): string {
        // Create a stable key based on ledger ID and schema snapshot
        const schemaHash = JSON.stringify(schemaSnapshot);
        return `${ledgerId}:${schemaHash}`;
    }

    /**
     * Estimate memory size of data (rough approximation)
     */
    private estimateSize(data: any): number {
        const jsonString = JSON.stringify(data);
        return jsonString.length * 2; // Rough estimate: 2 bytes per character
    }

    /**
     * Get cached data if valid
     */
    get(ledgerId: string, schemaSnapshot: any[], maxAge: number = 5 * 60 * 1000): any | null {
        const key = this.getCacheKey(ledgerId, schemaSnapshot);
        const entry = this.cache.get(key);

        if (!entry) {
            return null; // Cache miss
        }

        // Check if entry is too old
        if (Date.now() - entry.timestamp > maxAge) {
            this.cache.delete(key);
            this.currentSize -= entry.size;
            return null; // Expired
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.data;
    }

    /**
     * Store data in cache
     */
    set(ledgerId: string, schemaSnapshot: any[], data: any, schemaVersion: number = 1): void {
        const key = this.getCacheKey(ledgerId, schemaSnapshot);
        const size = this.estimateSize(data);

        // Remove existing entry if present
        const existingEntry = this.cache.get(key);
        if (existingEntry) {
            this.currentSize -= existingEntry.size;
            this.cache.delete(key);
        }

        // Evict entries if necessary
        this.evictIfNecessary(size);

        // Add new entry
        const entry: CacheEntry = {
            data,
            timestamp: Date.now(),
            schemaVersion,
            size
        };

        this.cache.set(key, entry);
        this.currentSize += size;
    }

    /**
     * Invalidate cache entries for a specific ledger
     */
    invalidateLedger(ledgerId: string): void {
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache) {
            if (key.startsWith(`${ledgerId}:`)) {
                keysToDelete.push(key);
                this.currentSize -= entry.size;
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Invalidate cache entries with old schema versions
     */
    invalidateBySchemaVersion(ledgerId: string, minSchemaVersion: number): void {
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache) {
            if (key.startsWith(`${ledgerId}:`) && entry.schemaVersion < minSchemaVersion) {
                keysToDelete.push(key);
                this.currentSize -= entry.size;
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.currentSize = 0;
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        entries: number;
        sizeBytes: number;
        sizeMB: number;
        maxSizeMB: number;
        hitRate?: number;
    } {
        return {
            entries: this.cache.size,
            sizeBytes: this.currentSize,
            sizeMB: this.currentSize / (1024 * 1024),
            maxSizeMB: this.maxSize / (1024 * 1024)
        };
    }

    /**
     * Evict least recently used entries if necessary
     */
    private evictIfNecessary(newEntrySize: number): void {
        // Evict by entry count
        while (this.cache.size >= this.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                const entry = this.cache.get(firstKey)!;
                this.currentSize -= entry.size;
                this.cache.delete(firstKey);
            }
        }

        // Evict by size
        while (this.currentSize + newEntrySize > this.maxSize && this.cache.size > 0) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                const entry = this.cache.get(firstKey)!;
                this.currentSize -= entry.size;
                this.cache.delete(firstKey);
            }
        }
    }
}

// Global cache instance
export const ledgerDataCache = new LedgerDataCache();