import { LedgerSchema } from './ledger';
import { CanvasNode, CanvasEdge, Viewport } from './nodeEditor';

/**
 * Export file structure for portable templates
 */
export interface TemplateExport {
    exportVersion: '1.0';
    exportedAt: string; // ISO 8601
    profileName: string;
    schemas: LedgerSchema[];
    nodeGraph?: {
        nodes: CanvasNode[];
        edges: CanvasEdge[];
        viewport: Viewport;
    };
}

/**
 * Import result with conflicts
 */
export interface TemplateImportResult {
    success: boolean;
    importedSchemas: number;
    importedNodes: number;
    conflicts: ImportConflict[];
    errors: string[];
}

/**
 * Schema/version conflict during import
 */
export interface ImportConflict {
    type: 'schema_exists' | 'version_mismatch' | 'node_exists';
    itemId: string;
    existingVersion?: number;
    importVersion?: number;
    resolution?: 'skip' | 'overwrite' | 'merge';
}
