const fs = require('fs');

function replaceAll(file, search, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(search).join(replace);
    fs.writeFileSync(file, content, 'utf8');
}

function replaceRegex(file, regex, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replace);
    fs.writeFileSync(file, content, 'utf8');
}

// 1. NodeCanvas.tsx
let f = 'src/features/nodeEditor/NodeCanvas.tsx';
replaceAll(f, "import { getTypeDisplayName } from './utils/portTypeUtils';", "");
replaceAll(f, "const { nodes, edges, onNodesChange, onEdgesChange, onConnect, schemas } = useNodeStore();", "const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useNodeStore();");
replaceAll(f, "onConnectStart={({ handleId, nodeId }) =>", "onConnectStart={(_event, { handleId, nodeId }) =>");
replaceAll(f, "connectionLineComponent={ConnectionLine}", "connectionLineComponent={ConnectionLine as any}");

// 2. ConnectionLine.tsx
f = 'src/features/nodeEditor/components/ConnectionLine.tsx';
replaceRegex(f, /export interface ExtendedConnectionLineProps extends ConnectionLineComponentProps \{\n\s+connectionStatus\?: 'valid' \| 'invalid' \| null;\n\}/, "export interface ExtendedConnectionLineProps extends Omit<ConnectionLineComponentProps, 'connectionStatus'> {\n    connectionStatus?: 'valid' | 'invalid' | null;\n}");
replaceRegex(f, /connectionLineType,/, "_connectionLineType,");
replaceRegex(f, /fromNode,/, "_fromNode,");
replaceRegex(f, /fromHandle,/, "_fromHandle,");

// 3. ConnectionLine.test.tsx
f = 'src/features/nodeEditor/components/ConnectionLine.test.tsx';
replaceRegex(f, /import React from 'react';/, "import { Position, ConnectionLineType } from '@xyflow/react';");
replaceRegex(f, /fromPosition: undefined,/, "fromPosition: Position.Top,");
replaceRegex(f, /toPosition: undefined,/, "toPosition: Position.Bottom,");
replaceRegex(f, /connectionLineType: undefined,/, "connectionLineType: ConnectionLineType.Bezier,");
replaceAll(f, "connectionStatus: 'default',", "connectionStatus: null,");
replaceAll(f, 'connectionStatus="default"', 'connectionStatus={null}');
replaceAll(f, "connectionStatus: 'default'", "connectionStatus: null");

// 4. useEdgeDrag.ts
f = 'src/features/nodeEditor/hooks/useEdgeDrag.ts';
replaceAll(f, "const REBUILD_THROTTLE_MS = 16;", "// const REBUILD_THROTTLE_MS = 16;");
replaceAll(f, "const touchStartRef = useRef<{ x: number, y: number } | null>(null);", "// const touchStartRef = useRef<{ x: number, y: number } | null>(null);");
replaceRegex(f, /if \(cancelDrag\) cancelDrag\(\);\n\s+const cancelDrag = \(\) => \{/, "let cancelDrag: (() => void) | undefined;\n            if (cancelDrag) cancelDrag();\n            \n            cancelDrag = () => {");

// 5. useHandlePositions.ts
f = 'src/features/nodeEditor/hooks/useHandlePositions.ts';
replaceAll(f, "const DEFAULT_VIEWPORT_PADDING = 20;", "// const DEFAULT_VIEWPORT_PADDING = 20;");

// 6. LedgerSourceNode.tsx
f = 'src/features/nodeEditor/nodes/LedgerSourceNode.tsx';
replaceAll(f, "Record<PortType, string>", "Record<string, string>");

// 7. portTypeUtils.test.ts
f = 'src/features/nodeEditor/utils/portTypeUtils.test.ts';
replaceAll(f, "import { CanvasNode } from '@/types/nodeEditor';", "// import { CanvasNode } from '@/types/nodeEditor';");

// 8. snapDetection.ts
f = 'src/features/nodeEditor/utils/snapDetection.ts';
replaceAll(f, "const snapRadius = 15;", "// const snapRadius = 15;");

// 9. flattenRelations.test.ts
f = 'src/lib/flattenRelations.test.ts';
replaceRegex(f, /\{ name: '(\w+)', type: 'text' \}/g, "{ id: 'id_$1', name: '$1', type: 'text' }");
replaceRegex(f, /\{ name: '(\w+)', type: 'relation', relationTarget: '(\w+)' \}/g, "{ id: 'id_$1', name: '$1', type: 'relation', relationTarget: '$2' }");
replaceRegex(f, /\{ name: '(\w+)', type: 'number' \}/g, "{ id: 'id_$1', name: '$1', type: 'number' }");

// 10. migration.test.ts
f = 'src/lib/migration.test.ts';
replaceAll(f, "{ name: 'name', type: 'text' }", "{ id: 'id_name', name: 'name', type: 'text' }");
replaceAll(f, "{ name: 'title', type: 'text' }", "{ id: 'id_title', name: 'title', type: 'text' }");

// 11. templateExport.test.ts
f = 'src/lib/templateExport.test.ts';
replaceAll(f, "{ name: 'amount', type: 'text' }", "{ id: 'id_amount', name: 'amount', type: 'text' }");
replaceAll(f, "{ name: 'name', type: 'text' }", "{ id: 'id_name', name: 'name', type: 'text' }");

// 12. templateImport.ts
f = 'src/lib/templateImport.ts';
replaceAll(f, "entry.data, entry.tags, false", "entry.data, entry.tags, false, undefined");

// 13. useNodeStore.ts
f = 'src/stores/useNodeStore.ts';
replaceAll(f, "const childNodeIds = get().edges", "// const childNodeIds = get().edges");
replaceAll(f, "(node as any).id", "(node as CanvasNode).id");
replaceAll(f, "...node,", "...(node as CanvasNode),");
replaceAll(f, "const savedNodes = (profileDoc.nodes || []) as CanvasNode[];", "const savedNodes = (profileDoc.nodes || []) as any as CanvasNode[];");
replaceRegex(f, /const newNodes = savedNodes.map/, "const newNodes = (savedNodes as any[]).map");

// 14. useSchemaBuilderStore.ts
f = 'src/stores/useSchemaBuilderStore.ts';
replaceAll(f, "{ name: newFieldName, type: 'text', required: false }", "{ id: crypto.randomUUID(), name: newFieldName, type: 'text', required: false }");
