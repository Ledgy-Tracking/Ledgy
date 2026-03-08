/**
 * Plugin permission types
 */
export type PluginPermission =
    | 'ledger:read'
    | 'ledger:write'
    | 'ledger:delete'
    | 'external:api'
    | 'filesystem:read'
    | 'filesystem:write';

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    permissions: PluginPermission[];
    entryPoint: string;
    author?: string;
}

/**
 * Granted plugin permissions
 */
export interface PluginPermissions {
    pluginId: string;
    granted: PluginPermission[];
    denied: PluginPermission[];
}

/**
 * Plugin runtime state
 */
export interface PluginState {
    plugins: PluginManifest[];
    enabledPlugins: string[];
    permissions: PluginPermissions[];
    isLoading: boolean;
    error: string | null;
}
