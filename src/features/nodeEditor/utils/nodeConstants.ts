/**
 * Node Editor Constants
 * Centralized configuration values for Node Forge
 */

// Cache and Performance Limits
// Using unlimited/max cache per decision - Story 4.5 review
export const LEDGER_CACHE_SIZE_DEFAULT = Number.MAX_SAFE_INTEGER;
export const LEDGER_CACHE_SIZE_MIN = 100;
export const LEDGER_CACHE_SIZE_MAX = Number.MAX_SAFE_INTEGER;
export const LEDGER_CACHE_SIZE_OPTIONS = [100, 500, 1000, Number.MAX_SAFE_INTEGER] as const;

// Node Input Limits
export const ARITHMETIC_MIN_INPUTS = 2;
export const ARITHMETIC_MAX_INPUTS = 5;

// Debounce and Timing
export const SAVE_DEBOUNCE_MS = 1000;
export const REFRESH_DEBOUNCE_MS = 500;
export const PREVIEW_THROTTLE_MS = 500;
export const FRESH_DATA_INDICATOR_MS = 5000;

// Retry Configuration
export const SAVE_MAX_RETRIES = 3;
export const SAVE_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

// Node Display
export const NODE_WIDTH_LEDGER_SOURCE = 240;
export const NODE_MAX_HEIGHT_FIELDS = 320; // px for scrollable area
export const NODE_MAX_FIELDS_BEFORE_SCROLL = 8;

// Canvas
export const CANVAS_GRID_SIZE_DEFAULT = 15;

// Type Colors (for reference - actual values in portColors.ts)
// text: zinc-400 (#a1a1aa)
// number: emerald-500 (#10b981)
// number[]: cyan-500 (#06b6d4)
// date: amber-500 (#f59e0b)
// relation: purple-500 (#a855f7)
// boolean: purple-500 (#a855f7)
