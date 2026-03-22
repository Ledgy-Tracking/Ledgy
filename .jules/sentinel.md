## 2026-03-10 - Error Boundary Information Disclosure
**Vulnerability:** The `ErrorBoundary` component was appending the raw React `errorInfo.componentStack` to the error message string dispatched to the global `useErrorStore`. This string could be displayed to end users via toast notifications or error UI, potentially leaking internal component structure, file paths, and application architecture details.
**Learning:** Raw stack traces and internal debugging information should never be passed into user-facing state or error stores. Such detailed internal information should strictly be logged to secure, developer-only channels (like `console.error` during development).
**Prevention:** Always sanitize error messages before dispatching them to user-facing stores. Distinguish between 'safe' user-facing error messages and internal stack traces/details.

## 2026-03-21 - Insecure Dynamic Import via new Function()
**Vulnerability:** The template import and export modules used `new Function('return import(...)')` to load `@tauri-apps/api` modules dynamically. This is functionally equivalent to `eval()`, bypassing modern security protections and potentially violating Content Security Policy (CSP) `unsafe-eval` restrictions.
**Learning:** Using `new Function()` or `eval()` to circumvent bundler static analysis (like Vite) is a dangerous anti-pattern. Standard dynamic `import()` statements should be used instead.
**Prevention:** Strictly avoid `new Function()` and `eval()` for module loading. Use ESM dynamic `import()` which is natively supported and secure.

## 2026-03-10 - Secure AutoComplete Attributes
**Vulnerability:** Sensitive inputs (TOTP codes, passphrases, remote database credentials) lacked appropriate `autoComplete` attributes. This could allow password managers or browsers to improperly suggest or save credentials, leading to accidental credential leakage or usability issues preventing proper password manager functionality.
**Learning:** React components handling sensitive authentication and configuration data must explicitly declare `autoComplete` strategies. For passphrases, use `"new-password"` or `"current-password"` to guide password managers. For TOTP inputs, use `"one-time-code"` to allow OS-level auto-filling from SMS/Mail. For custom credentials (like remote DB URLs/passwords), use `"off"` to prevent incorrect browser auto-filling.
**Prevention:** Always add explicit `autoComplete` attributes to any `<input type="password">` or sensitive text/number input handling security credentials.
