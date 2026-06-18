import fs from 'fs';
let text = fs.readFileSync('tests/AppShell.test.tsx', 'utf-8');
text = text.replace(/expect\(screen.queryByRole\('button', \{ name: \/toggle sidebar\/i \}\) \|\| screen.queryByRole\('button', \{ name: \/open sidebar\/i \}\) \|\| screen.queryByRole\('button', \{ name: \/close sidebar\/i \}\)\).toBeNull\(\);/g,
  "expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();");
fs.writeFileSync('tests/AppShell.test.tsx', text);
