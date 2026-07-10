1.  **Refactor `AppShell.tsx` dynamic ARIA labels:**
    The dynamic labels in `src/components/Layout/AppShell.tsx` for sidebar and inspector toggles (e.g., `aria-label={leftSidebarOpen ? 'Close sidebar' : 'Open sidebar'}`) violate the Palette accessibility standard: "Replace dynamic aria-label values (e.g., 'Open/Close') on toggle buttons with static labels (e.g., 'Toggle') combined with explicit state attributes (aria-expanded or aria-pressed)."
    - Change `aria-label` to `"Toggle sidebar"` and `"Toggle inspector"`.
    - Add `aria-pressed={leftSidebarOpen}` and `aria-pressed={rightInspectorOpen}`.
    - Also update the tooltips to match the static labels.
    - Also do the same for the Theme and View Mode buttons (`aria-pressed={theme === 'dark'}` and `aria-pressed={dashboardViewMode === 'grid'}`).

2.  **Verify changes locally:**
    - Run `pnpm lint` and `pnpm test src/components/Layout/AppShell.test.tsx` (if it exists) or just run the test suite.
    - Run a bash command to visually verify the `git diff --cached`.

3.  **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

4.  **Submit the code:**
    - PR Title: `🎨 Palette: Improve accessibility of AppShell toggle buttons`
    - Description fields: 💡 What, 🎯 Why, 📸 Before/After, ♿ Accessibility.
