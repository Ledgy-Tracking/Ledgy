## 2025-02-28 - Missing AutoComplete on Sensitive Inputs
**Vulnerability:** Sensitive authentication inputs (TOTP code and passphrase fields) were missing explicit `autoComplete` attributes. This could lead to credential leakage via browser history, auto-filling in incorrect contexts, and prevents password managers from securely filling or generating credentials.
**Learning:** Browsers and password managers rely on standard `autoComplete` hints (`new-password`, `current-password`, `one-time-code`) to securely handle sensitive data. Omitting them degrades security and UX.
**Prevention:** Always define explicit `autoComplete` attributes for inputs handling secrets, tokens, or passwords to control browser caching and enable secure auto-fill.
