## 2024-05-14 - Importance of `aria-pressed` for Icon-Only Toggle Buttons
**Learning:** Icon-only view-switcher buttons (like table vs. grid views) often rely solely on visual cues (e.g., active styling like a background color change or a different icon color) to denote selection. For screen reader users, just having an `aria-label` is insufficient because it doesn't convey which state is currently active.
**Action:** Always add an `aria-pressed={isActive}` boolean attribute alongside an `aria-label` for any toggleable or state-switching icon buttons, especially those that function as tab-like switchers.

## 2024-05-18 - [ARIA Label for Icon-Only Buttons]
**Learning:** Icon-only UI components in toolbars/sidebars often miss explicit ARIA labels, rendering them inaccessible or poorly described for screen reader users. In this project, the Inspector close button was lacking an `aria-label`.
**Action:** Ensure all icon-only buttons, especially structural ones like "Close" or "Toggle", have explicit `aria-label` attributes to ensure keyboard and screen reader accessibility.

## 2025-02-23 - Playwright Verification Context & Dashboard Icons
**Learning:** The Dashboard page contains heavily icon-centric action bars (e.g. Inspector open/close, view toggles) which completely lack screen reader accessibility. Verifying these required automating the TOTP and Profile setup flows, revealing that Playwright struggles to click nested elements inside the Profile Card unless targeting specific text nodes.
**Action:** When adding `aria-labels` to complex dashboards, always ensure `aria-pressed` states are added for toggles. When verifying via Playwright, bypass profile card container clicks by specifically locating and clicking the nested `h3` profile name element.
## 2024-10-16 - WAI-ARIA aria-pressed semantics and Shadcn Toggles
**Learning:** When creating accessible toggle buttons, true toggles with static icons (like a grid icon) should use static labels and aria-pressed. However, buttons that dynamically swap their visual icons (e.g., Sun to Moon, Eye to EyeOff) must NOT use aria-pressed, as it results in redundant and confusing screen reader announcements (e.g., 'Switch to Grid, toggle button, pressed'). Because Shadcn's <Toggle> implicitly enforces aria-pressed via Radix, dynamically swapping buttons must use a standard <button type="button">, while static toggles should remain <Toggle> with fixed aria-labels.
**Action:** Audit all <Toggle> components to ensure aria-pressed is only applied to visually static icons, and replace dynamically swapping icons with native <button> implementations.
