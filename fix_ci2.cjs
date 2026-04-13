const fs = require('fs');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filepath, content, 'utf8');
}

// 2. ConnectionLine.test.tsx
replaceInFile('src/features/nodeEditor/components/ConnectionLine.test.tsx', [
    ["connectionStatus: null,", "connectionStatus: 'valid',"],
    ["connectionStatus={null}", "connectionStatus=\"valid\""],
    ["connectionStatus: null", "connectionStatus: 'valid'"]
]);
