
## $(date +%Y-%m-%d) - Optimize TOTP verification loop
**Learning:** Checking the most likely valid time step (0 offset) first in `verifyTOTP` avoids unnecessary WebCrypto API calls for valid, on-time codes, speeding up verification by ~3x in the happy path.
**Action:** Always consider the order of operations in loops involving expensive cryptographic functions (like `crypto.subtle.importKey` and `crypto.subtle.sign`). Prioritize the "happy path" or most likely valid state to exit the loop early.
