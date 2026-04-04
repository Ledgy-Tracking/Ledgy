## 2026-03-10 - Error Boundary Information Disclosure
**Vulnerability:** The `ErrorBoundary` component was appending the raw React `errorInfo.componentStack` to the error message string dispatched to the global `useErrorStore`. This string could be displayed to end users via toast notifications or error UI, potentially leaking internal component structure, file paths, and application architecture details.
**Learning:** Raw stack traces and internal debugging information should never be passed into user-facing state or error stores. Such detailed internal information should strictly be logged to secure, developer-only channels (like `console.error` during development).
**Prevention:** Always sanitize error messages before dispatching them to user-facing stores. Distinguish between 'safe' user-facing error messages and internal stack traces/details.

## 2026-03-21 - Insecure Dynamic Import via new Function()
**Vulnerability:** The template import and export modules used `new Function('return import(...)')` to load `@tauri-apps/api` modules dynamically. This is functionally equivalent to `eval()`, bypassing modern security protections and potentially violating Content Security Policy (CSP) `unsafe-eval` restrictions.
**Learning:** Using `new Function()` or `eval()` to circumvent bundler static analysis (like Vite) is a dangerous anti-pattern. Standard dynamic `import()` statements should be used instead.
**Prevention:** Strictly avoid `new Function()` and `eval()` for module loading. Use ESM dynamic `import()` which is natively supported and secure.

## 2026-03-24 - Insecure Random Generation for Identifiers
**Vulnerability:** The application used `Math.random()` as a fallback for generating action IDs in `useUndoRedoStore.ts`. This non-cryptographic generator can produce predictable outputs, potentially allowing an attacker to guess identifiers or bypass security checks relying on ID uniqueness.
**Learning:** `Math.random()` is not cryptographically secure and should never be used for generating identifiers or tokens. In modern browser environments, WebCrypto API is universally available, making fallbacks unnecessary.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.getRandomValues()` for unique identifiers to guarantee cryptographic security and unpredictability.

## 2026-03-10 - Secure AutoComplete Attributes
**Vulnerability:** Sensitive inputs (TOTP codes, passphrases, remote database credentials) lacked appropriate `autoComplete` attributes. This could allow password managers or browsers to improperly suggest or save credentials, leading to accidental credential leakage or usability issues preventing proper password manager functionality.
**Learning:** React components handling sensitive authentication and configuration data must explicitly declare `autoComplete` strategies. For passphrases, use `"new-password"` or `"current-password"` to guide password managers. For TOTP inputs, use `"one-time-code"` to allow OS-level auto-filling from SMS/Mail. For custom credentials (like remote DB URLs/passwords), use `"off"` to prevent incorrect browser auto-filling.
**Prevention:** Always add explicit `autoComplete` attributes to any `<input type="password">` or sensitive text/number input handling security credentials.

## 2025-02-18 - Client-Side Rate Limiting is Security Theater
**Vulnerability:** Relying on client-side state (localStorage) to enforce rate limits on login/MFA attempts.
**Learning:** In a local-first architecture without a backend server, client-side rate limiting offers no meaningful protection against malicious actors who can bypass the UI or modify local state.
**Prevention:** Avoid investing significant security effort into client-side rate limiters; treat them strictly as UX deterrents and focus on actual vulnerabilities like file parsing DoS or cryptographic weakness.

## 2025-05-24 - Enforce HTTPS for Basic Authentication
**Vulnerability:** Remote sync configuration (both `setup_sync` and `deleteRemoteDatabase`) was transmitting plaintext credentials via HTTP Basic Authentication without verifying the connection protocol. This could lead to credential interception (CWE-319) on local or wide area networks.
**Learning:** Basic Authentication merely base64 encodes credentials; without TLS (HTTPS), these credentials are trivially intercepted over the network. Localhost and private network exceptions (10.x, 172.16-31.x, 192.168.x) must be explicitly managed for local self-hosted sync to work.
**Prevention:** Always validate URL schemes before applying `Authorization: Basic` headers or embedding credentials in URLs. Use `isLocalNetwork()` to allow private IP ranges for self-hosted CouchDB instances while enforcing HTTPS for public connections.

## 2024-03-24 - File Import Denial of Service (DoS)
**Vulnerability:** Calling `FileReader.readAsText()` on user-uploaded files without size constraints. The `readTemplateBrowser` function could process arbitrarily large files, leading to browser memory exhaustion or crash.
**Learning:** Browser environments have limited memory allocations. Maliciously large JSON payloads can exhaust browser memory and freeze or crash the client application during import.
**Prevention:** Always enforce a reasonable file size limit (e.g., `file.size > 5 * 1024 * 1024` for 5MB) by checking `file.size` before instantiating a `FileReader` or processing file contents.
