## 2025-02-18 - Client-Side Rate Limiting is Security Theater
**Vulnerability:** Relying on client-side state (localStorage) to enforce rate limits on login/MFA attempts.
**Learning:** In a local-first architecture without a backend server, client-side rate limiting offers no meaningful protection against malicious actors who can bypass the UI or modify local state.
**Prevention:** Avoid investing significant security effort into client-side rate limiters; treat them strictly as UX deterrents and focus on actual vulnerabilities like file parsing DoS or cryptographic weakness.

## 2025-02-18 - File Import Denial of Service (DoS)
**Vulnerability:** Calling `FileReader.readAsText()` on user-uploaded files without size constraints.
**Learning:** Maliciously large JSON payloads can exhaust browser memory and freeze or crash the client application during import.
**Prevention:** Always enforce a reasonable file size limit (e.g., `file.size > 5 * 1024 * 1024` for 5MB) before processing local files in browser memory.
