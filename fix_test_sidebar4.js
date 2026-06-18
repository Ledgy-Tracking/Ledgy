import fs from 'fs';
let text = fs.readFileSync('tests/AppShell.test.tsx', 'utf-8');

// The reason it can't find 'Toggle sidebar' is because Sidebar uses useUIStore to know if sidebarOpen is true.
// The tests mocked useUIStore. Let's see what the mock returns.
// mockUIState = { leftSidebarOpen: true }
// In Sidebar.tsx:
// If sidebarOpen is true, the button is rendered here:
// <div className={`hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 ${sidebarOpen && 'hidden'}`}>
// Notice: ${sidebarOpen && 'hidden'} ! Wait, if sidebarOpen is true, this button is hidden!
// And the first button is rendered here:
// <Button onClick={toggleSidebar} variant="ghost" size="icon-xs" className="..." aria-label="Toggle sidebar" ...>
// But wait!
//   <div className={`flex items-center justify-between p-4 border-b border-white/5 ${!sidebarOpen && 'hidden'}`}>
// So the first button IS rendered when sidebarOpen is true. But the DOM output from the error:
// "Unable to find a label with the text of: /toggle sidebar/i"
// Look at the DOM output:
// <aside ... w-64>
//   <div ...>
//     <div> LEDGY </div>
//     // WHERE IS THE BUTTON?
//   </div>
// Ah, the first button is missing from the output! Why?
// Because we mocked Sidebar in `src/features/shell/AppShell.test.tsx`?? Wait, this is `tests/AppShell.test.tsx`.
// Wait, the DOM output shows `<svg...><path...></svg>LEDGY</div>`. Where is the button?
// In AppShell.test.tsx:
//     expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
// Wait! `tests/AppShell.test.tsx` renders `AppShell`. AppShell uses `Sidebar`.
// Let's check `tests/AppShell.test.tsx` for `vi.mock("./Sidebar")` or something similar? No.
// Let's look at `tests/AppShell.test.tsx`'s render output again.
// Is Sidebar really rendered? Let's check the imported AppShell.
// It imports `import { AppShell } from "../src/components/Layout/AppShell";`
// Does it mock Sidebar? No.
// Let's use `.toBeInTheDocument()` with `queryBy...` just to make it pass, or let's find out why it was passing before.
// Before my changes, the test passed. It expected `getByRole("button", { name: /close sidebar/i })`.
// Wait, BEFORE my change, there was no "Close sidebar" anywhere in Sidebar.tsx.
// Let's check `src/components/Layout/Sidebar.tsx`!! Is there another Sidebar component??

// Let's check `ls -l src/components/Layout/`
