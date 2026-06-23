## 2024-05-14 - Importance of `aria-pressed` for Icon-Only Toggle Buttons
**Learning:** Icon-only view-switcher buttons (like table vs. grid views) often rely solely on visual cues (e.g., active styling like a background color change or a different icon color) to denote selection. For screen reader users, just having an `aria-label` is insufficient because it doesn't convey which state is currently active.
**Action:** Always add an `aria-pressed={isActive}` boolean attribute alongside an `aria-label` for any toggleable or state-switching icon buttons, especially those that function as tab-like switchers.

## 2024-05-18 - [ARIA Label for Icon-Only Buttons]
**Learning:** Icon-only UI components in toolbars/sidebars often miss explicit ARIA labels, rendering them inaccessible or poorly described for screen reader users. In this project, the Inspector close button was lacking an `aria-label`.
**Action:** Ensure all icon-only buttons, especially structural ones like "Close" or "Toggle", have explicit `aria-label` attributes to ensure keyboard and screen reader accessibility.

## 2025-02-23 - Playwright Verification Context & Dashboard Icons
**Learning:** The Dashboard page contains heavily icon-centric action bars (e.g. Inspector open/close, view toggles) which completely lack screen reader accessibility. Verifying these required automating the TOTP and Profile setup flows, revealing that Playwright struggles to click nested elements inside the Profile Card unless targeting specific text nodes.
**Action:** When adding `aria-labels` to complex dashboards, always ensure `aria-pressed` states are added for toggles. When verifying via Playwright, bypass profile card container clicks by specifically locating and clicking the nested `h3` profile name element.

## 2025-06-23 - AppShell Layout Toggles ARIA States
**Learning:** For layout toggle buttons that expand or collapse sections (such as sidebars or inspector panels), dynamically binding the `aria-expanded` attribute to the boolean visibility state of the target panel is essential. Similarly, view mode or theme toggles should use `aria-pressed`. Static `aria-labels` should be used instead of dynamic labels that change based on state, as state is handled by the ARIA attributes.
**Action:** Replace dynamic `aria-label` values on layout toggle buttons with static labels (e.g., 'Toggle') combined with explicit state attributes (`aria-expanded` or `aria-pressed`). Ensure tooltip texts exactly match the static `aria-label`.
