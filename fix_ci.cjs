const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filepath, content, 'utf8');
}

replaceInFile('src/features/nodeEditor/components/ConnectionLine.tsx', [
    [
        "export interface ExtendedConnectionLineProps extends ConnectionLineComponentProps {\n    connectionStatus: 'valid' | 'invalid' | null;\n}",
        "export interface ExtendedConnectionLineProps extends Omit<ConnectionLineComponentProps, 'connectionStatus'> {\n    connectionStatus?: 'valid' | 'invalid' | null;\n}"
    ],
    [
        "connectionLineType: _connectionLineType,",
        "connectionLineType,"
    ],
    [
        "fromNode: _fromNode,",
        "fromNode,"
    ],
    [
        "fromHandle: _fromHandle,",
        "fromHandle,"
    ]
]);
