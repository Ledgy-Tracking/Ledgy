
## $(date +%Y-%m-%d) - Optimize TOTP verification loop
**Learning:** Checking the most likely valid time step (0 offset) first in `verifyTOTP` avoids unnecessary WebCrypto API calls for valid, on-time codes, speeding up verification by ~3x in the happy path.
**Action:** Always consider the order of operations in loops involving expensive cryptographic functions (like `crypto.subtle.importKey` and `crypto.subtle.sign`). Prioritize the "happy path" or most likely valid state to exit the loop early.

## $(date +%Y-%m-%d) - Pre-import CryptoKey outside expensive loops
**Learning:** `crypto.subtle.importKey` introduces a measurable overhead (~1ms) that adds up when placed inside a loop checking multiple permutations (such as the window tolerance loop in `verifyTOTP` checking multiple time offsets and algorithms).
**Action:** When performing repeated HMAC signing or other WebCrypto operations within a loop based on the same key material, either pass the pre-imported `CryptoKey` to the function or lazily load and cache it outside the loop.

## $(date +%Y-%m-%d) - TextEncoder and CryptoKey caching
**Learning:** `new TextEncoder()` and `crypto.subtle.importKey()` are relatively expensive operations. Inside functions called during rate limit state updates, instantiating these on every invocation can introduce unnecessary overhead.
**Action:** When working with repetitive hashing or serialization operations, cache `TextEncoder` instances at the module level. Similarly, lazy load and cache the resulting `CryptoKey` from `importKey` so it is reused across subsequent function calls.
