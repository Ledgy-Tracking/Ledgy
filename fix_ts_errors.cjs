const fs = require('fs');
const path = require('path');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filepath, content, 'utf8');
}

// 1. ConnectionLine.tsx
replaceInFile('src/features/nodeEditor/components/ConnectionLine.tsx', [
    [
        "export interface ExtendedConnectionLineProps extends ConnectionLineComponentProps {\n    connectionStatus?: 'valid' | 'invalid' | null;\n}",
        "export interface ExtendedConnectionLineProps extends ConnectionLineComponentProps {\n    connectionStatus: 'valid' | 'invalid' | null;\n}"
    ],
    [
        "connectionLineType,",
        "_connectionLineType,"
    ],
    [
        "fromNode,",
        "_fromNode,"
    ],
    [
        "fromHandle,",
        "_fromHandle,"
    ]
]);

// 2. ConnectionLine.test.tsx
replaceInFile('src/features/nodeEditor/components/ConnectionLine.test.tsx', [
    ["import React from 'react';", "import { Position, ConnectionLineType } from '@xyflow/react';"],
    ["fromPosition: undefined,", "fromPosition: Position.Top,"],
    ["toPosition: undefined,", "toPosition: Position.Bottom,"],
    ["connectionLineType: undefined,", "connectionLineType: ConnectionLineType.Bezier,"],
    ["connectionStatus: 'default',", "connectionStatus: null,"],
    ["connectionStatus=\"default\"", "connectionStatus={null}"],
    ["connectionStatus: 'default'", "connectionStatus: null"]
]);

// 3. NodeCanvas.tsx
replaceInFile('src/features/nodeEditor/NodeCanvas.tsx', [
    ["import { getTypeDisplayName } from './utils/portTypeUtils';", ""],
    ["const { nodes, edges, onNodesChange, onEdgesChange, onConnect, schemas } = useNodeStore();", "const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useNodeStore();"],
    ["onConnectStart={({ handleId, nodeId }) =>", "onConnectStart={(_event, { handleId, nodeId }) =>"],
    ["connectionLineComponent={ConnectionLine}", "connectionLineComponent={ConnectionLine as any}"]
]);

// 4. useEdgeDrag.ts
replaceInFile('src/features/nodeEditor/hooks/useEdgeDrag.ts', [
    ["const REBUILD_THROTTLE_MS = 16;", "// const REBUILD_THROTTLE_MS = 16;"],
    ["const touchStartRef = useRef<{ x: number, y: number } | null>(null);", "// const touchStartRef = useRef<{ x: number, y: number } | null>(null);"],
    [
        "if (cancelDrag) cancelDrag();\n            \n            const cancelDrag = () => {",
        "const cancelDrag = () => {\n                document.removeElementListener?.('mouseup', handleMouseUp);\n            };\n            if (cancelDrag) cancelDrag();"
    ]
]);

// Let's actually check useEdgeDrag.ts manually first
