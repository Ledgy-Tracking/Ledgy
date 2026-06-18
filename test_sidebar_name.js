import fs from 'fs';
const text = fs.readFileSync('tests/AppShell.test.tsx', 'utf-8');
const match1 = text.includes('getByRole("button", { name: /toggle sidebar/i })');
const match2 = text.includes("getByRole('button', { name: /toggle sidebar/i })");
console.log('Match 1 (double quotes):', match1);
console.log('Match 2 (single quotes):', match2);
