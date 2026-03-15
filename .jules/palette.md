## 2024-05-18 - Icon-only toggle button accessibility
**Learning:** For toggle buttons (especially icon-only ones like the table/grid view toggle in Dashboard.tsx), an `aria-label` provides the name, but `aria-pressed` is crucial to convey the current active state to screen readers. Relying solely on visual cues (like background color changes) excludes visually impaired users from understanding which view is currently selected.
**Action:** Always add `aria-pressed={isActive}` to toggle-style icon buttons alongside their descriptive `aria-label`.
