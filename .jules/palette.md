## 2023-10-27 - App Shell Toggle Buttons Accessibility
**Learning:** Found that dynamic `aria-label` values (e.g. "Open sidebar" vs "Close sidebar") are sub-optimal for screen readers when dealing with toggle buttons.
**Action:** Replaced dynamic `aria-label` strings with static ones (e.g. "Toggle sidebar") and properly bound the `aria-expanded` and `aria-pressed` boolean attributes to their corresponding component state variables. Ensure tooltips match the static labels to avoid confusing mismatched announcements.
