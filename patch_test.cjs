const fs = require('fs');
const file = 'tests/features/nodeEditor/groupNodes.test.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace vi.mock('nanoid') with global.crypto mocking
code = code.replace(
  /vi\.mock\('nanoid', \(\) => \(\{\n    nanoid: vi\.fn\(\(\) => 'abc123'\),\n\}\)\);/,
  `Object.defineProperty(globalThis, 'crypto', {
    value: {
        randomUUID: vi.fn(() => 'abc123xyz')
    }
});`
);

fs.writeFileSync(file, code);
