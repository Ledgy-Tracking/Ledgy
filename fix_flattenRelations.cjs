const fs = require('fs');

const filepath = 'src/lib/flattenRelations.test.ts';
let content = fs.readFileSync(filepath, 'utf8');

// The tests fail because they use objects without an `id` property, which is required by SchemaField
content = content.replace(/\{ name: '(\w+)', type: 'text' \}/g, "{ id: 'id_$1', name: '$1', type: 'text' }");
content = content.replace(/\{ name: '(\w+)', type: 'relation', relationTarget: '(\w+)' \}/g, "{ id: 'id_$1', name: '$1', type: 'relation', relationTarget: '$2' }");
content = content.replace(/\{ name: '(\w+)', type: 'number' \}/g, "{ id: 'id_$1', name: '$1', type: 'number' }");

fs.writeFileSync(filepath, content, 'utf8');
