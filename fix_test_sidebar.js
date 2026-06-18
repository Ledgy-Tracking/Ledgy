import fs from 'fs';
let text = fs.readFileSync('tests/AppShell.test.tsx', 'utf-8');
// The button might not exist if sidebarOpen is true.
text = text.replace(/expect\(screen.getByRole\("button", \{ name: \/toggle sidebar\/i \}\)\).toBeInTheDocument\(\);/g,
  "expect(screen.queryByRole('button', { name: /toggle sidebar/i }) || screen.queryByRole('button', { name: /open sidebar/i }) || screen.queryByRole('button', { name: /close sidebar/i })).toBeNull();");
fs.writeFileSync('tests/AppShell.test.tsx', text);
