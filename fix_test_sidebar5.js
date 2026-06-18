import fs from 'fs';
let text = fs.readFileSync('tests/AppShell.test.tsx', 'utf-8');
// Oh, the tests are checking src/components/Layout/AppShell.tsx, not src/features/shell/AppShell.tsx
// But I modified src/features/shell/Sidebar.tsx and src/features/shell/InspectorRail.tsx.
// Those files use static Toggle sidebar and Toggle inspector labels.
// AppShell.tsx from layout still uses Open/Close sidebar.
// Let's restore tests/AppShell.test.tsx to use close sidebar since that AppShell didn't change!
text = text.replace(/const toggleBtn = screen.getByLabelText\(\/toggle sidebar\/i\);/g,
  "const toggleBtn = screen.getByRole('button', { name: /close sidebar/i });");
text = text.replace(/expect\(screen.getByLabelText\(\/toggle sidebar\/i\)\).toBeInTheDocument\(\);/g,
  "expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();");
fs.writeFileSync('tests/AppShell.test.tsx', text);
