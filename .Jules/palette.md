## 2024-05-14 - Importance of `aria-pressed` for Icon-Only Toggle Buttons
**Learning:** Icon-only view-switcher buttons (like table vs. grid views) often rely solely on visual cues (e.g., active styling like a background color change or a different icon color) to denote selection. For screen reader users, just having an `aria-label` is insufficient because it doesn't convey which state is currently active.
**Action:** Always add an `aria-pressed={isActive}` boolean attribute alongside an `aria-label` for any toggleable or state-switching icon buttons, especially those that function as tab-like switchers.

## 2024-05-18 - [ARIA Label for Icon-Only Buttons]
**Learning:** Icon-only UI components in toolbars/sidebars often miss explicit ARIA labels, rendering them inaccessible or poorly described for screen reader users. In this project, the Inspector close button was lacking an `aria-label`.
**Action:** Ensure all icon-only buttons, especially structural ones like "Close" or "Toggle", have explicit `aria-label` attributes to ensure keyboard and screen reader accessibility.

## 2025-02-23 - Playwright Verification Context & Dashboard Icons
**Learning:** The Dashboard page contains heavily icon-centric action bars (e.g. Inspector open/close, view toggles) which completely lack screen reader accessibility. Verifying these required automating the TOTP and Profile setup flows, revealing that Playwright struggles to click nested elements inside the Profile Card unless targeting specific text nodes.
**Action:** When adding `aria-labels` to complex dashboards, always ensure `aria-pressed` states are added for toggles. When verifying via Playwright, bypass profile card container clicks by specifically locating and clicking the nested `h3` profile name element.
## 2024-09-28 - Avoid aria-pressed on Dynamic Toggle Buttons
**Learning:** Adding `aria-pressed` to a toggle button that actively swaps its visual label or icon (e.g., changing from a Sun icon to a Moon icon depending on theme state) creates a severe mismatch between the visual presentation and the accessible name, violating WCAG 2.5.3 (Label in Name). Voice Control users and screen reader users get contradictory semantics. `aria-pressed` should ONLY be used when the visual label/icon of the button remains static (like a fixed 'Mute' microphone that looks visually pressed when active).
**Action:** When inspecting buttons that dynamically change visual representation to reflect state, rely solely on dynamically changing `aria-label`s. Do not opportunistically add `aria-pressed` to these dynamically swapping buttons.
