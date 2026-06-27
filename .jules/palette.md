## 2023-10-27 - App Shell Toggle Buttons Accessibility
**Learning:** Found that dynamic `aria-label` values (e.g. "Open sidebar" vs "Close sidebar") are sub-optimal for screen readers when dealing with toggle buttons.
**Action:** Replaced dynamic `aria-label` strings with static ones (e.g. "Toggle sidebar") and properly bound the `aria-expanded` and `aria-pressed` boolean attributes to their corresponding component state variables. Ensure tooltips match the static labels to avoid confusing mismatched announcements.
## 2023-10-27 - Component Typings for ConnectionLine
**Learning:** Found that when wrapping components like `ConnectionLineComponent` using `Omit` to change properties (e.g. `connectionStatus`), tests can fail if the original properties aren't completely satisfied, particularly `fromPosition`/`toPosition` and the underlying DOM elements like `fromNode`.
**Action:** Always provide full stubs (e.g. `{}` casted as `any`) in tests when mocking xyflow objects, and explicitly assign enums (like `'right'` and `'default'`) instead of `undefined` when testing components that rely on them internally.
