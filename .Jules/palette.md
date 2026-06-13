## 2024-05-14 - Importance of `aria-pressed` for Icon-Only Toggle Buttons
**Learning:** Icon-only view-switcher buttons (like table vs. grid views) often rely solely on visual cues (e.g., active styling like a background color change or a different icon color) to denote selection. For screen reader users, just having an `aria-label` is insufficient because it doesn't convey which state is currently active.
**Action:** Always add an `aria-pressed={isActive}` boolean attribute alongside an `aria-label` for any toggleable or state-switching icon buttons, especially those that function as tab-like switchers.

## 2024-05-18 - [ARIA Label for Icon-Only Buttons]
**Learning:** Icon-only UI components in toolbars/sidebars often miss explicit ARIA labels, rendering them inaccessible or poorly described for screen reader users. In this project, the Inspector close button was lacking an `aria-label`.
**Action:** Ensure all icon-only buttons, especially structural ones like "Close" or "Toggle", have explicit `aria-label` attributes to ensure keyboard and screen reader accessibility.

## 2025-02-23 - Playwright Verification Context & Dashboard Icons
**Learning:** The Dashboard page contains heavily icon-centric action bars (e.g. Inspector open/close, view toggles) which completely lack screen reader accessibility. Verifying these required automating the TOTP and Profile setup flows, revealing that Playwright struggles to click nested elements inside the Profile Card unless targeting specific text nodes.
**Action:** When adding `aria-labels` to complex dashboards, always ensure `aria-pressed` states are added for toggles. When verifying via Playwright, bypass profile card container clicks by specifically locating and clicking the nested `h3` profile name element.

## 2024-05-18 - ARIA States for Structural Toggles
**Learning:** Structural navigation elements (like sidebars and inspectors) that use visual shifts (like translating off-screen) often lack programmatic state indicators (`aria-expanded`) even if they have `aria-label`s. This makes it impossible for screen reader users to know if the panel is currently open or closed.
**Action:** When working with layout toggles that expand/collapse main structural panels, always dynamically bind `aria-expanded={isOpen}` to the toggle buttons.

## 2024-05-18 - ARIA States for Custom Segmented Controls
**Learning:** When using generic button components to build custom segmented controls or radio-group-like selectors (e.g., Sync Direction toggles), the active state is usually conveyed via CSS classes (e.g., `bg-background` vs `hover:bg-zinc-800`), which screen readers cannot parse.
**Action:** Always add `aria-pressed={isActive}` to custom buttons functioning as segmented controls so the active selection is programmatically clear.
