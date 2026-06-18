const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filepath, content, 'utf8');
}

// src/features/nodeEditor/hooks/useHandlePositions.ts
replaceInFile('src/features/nodeEditor/hooks/useHandlePositions.ts', [
    ["const DEFAULT_VIEWPORT_PADDING = 20;", "// const DEFAULT_VIEWPORT_PADDING = 20;"]
]);

// src/features/nodeEditor/utils/snapDetection.ts
replaceInFile('src/features/nodeEditor/utils/snapDetection.ts', [
    ["const snapRadius = 15;", "// const snapRadius = 15;"]
]);

// src/features/nodeEditor/utils/portTypeUtils.test.ts
replaceInFile('src/features/nodeEditor/utils/portTypeUtils.test.ts', [
    ["import { CanvasNode } from '@/types/nodeEditor';", "// import { CanvasNode } from '@/types/nodeEditor';"]
]);

// src/features/nodeEditor/nodes/LedgerSourceNode.tsx
replaceInFile('src/features/nodeEditor/nodes/LedgerSourceNode.tsx', [
    ["Record<PortType, string>", "Record<string, string>"]
]);

// src/lib/migration.test.ts
replaceInFile('src/lib/migration.test.ts', [
    ["{ name: 'name', type: 'text' }", "{ id: 'id_name', name: 'name', type: 'text' }"],
    ["{ name: 'title', type: 'text' }", "{ id: 'id_title', name: 'title', type: 'text' }"]
]);

// src/lib/templateExport.test.ts
replaceInFile('src/lib/templateExport.test.ts', [
    ["{ name: 'amount', type: 'text' }", "{ id: 'id_amount', name: 'amount', type: 'text' }"],
    ["{ name: 'name', type: 'text' }", "{ id: 'id_name', name: 'name', type: 'text' }"]
]);

// src/stores/useSchemaBuilderStore.ts
replaceInFile('src/stores/useSchemaBuilderStore.ts', [
    ["{ name: newFieldName, type: 'text', required: false }", "{ id: crypto.randomUUID(), name: newFieldName, type: 'text', required: false }"]
]);

// src/lib/templateImport.ts
replaceInFile('src/lib/templateImport.ts', [
    ["entry.data, entry.tags, false", "entry.data, entry.tags, false, undefined"]
]);

// src/stores/useNodeStore.ts
replaceInFile('src/stores/useNodeStore.ts', [
    ["const childNodeIds = get().edges", "// const childNodeIds = get().edges"],
    ["(node as any).id", "(node as CanvasNode).id"],
    ["...node,", "...(node as CanvasNode),"]
]);
