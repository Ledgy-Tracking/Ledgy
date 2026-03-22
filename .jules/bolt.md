## $(date +%Y-%m-%d) - Optimize TOTP verification loop
**Learning:** Checking the most likely valid time step (0 offset) first in `verifyTOTP` avoids unnecessary WebCrypto API calls for valid, on-time codes, speeding up verification by ~3x in the happy path.
**Action:** Always consider the order of operations in loops involving expensive cryptographic functions (like `crypto.subtle.importKey` and `crypto.subtle.sign`). Prioritize the "happy path" or most likely valid state to exit the loop early.

## $(date +%Y-%m-%d) - Pre-import CryptoKey outside expensive loops
**Learning:** `crypto.subtle.importKey` introduces a measurable overhead (~1ms) that adds up when placed inside a loop checking multiple permutations (such as the window tolerance loop in `verifyTOTP` checking multiple time offsets and algorithms).
**Action:** When performing repeated HMAC signing or other WebCrypto operations within a loop based on the same key material, either pass the pre-imported `CryptoKey` to the function or lazily load and cache it outside the loop.

## 2026-03-17 - Cache stateless objects to avoid GC pressure
**Learning:** Instantiating `new TextEncoder()` and `new TextDecoder()` frequently inside hot paths (like key derivation and crypto operations) introduces unnecessary object allocation and garbage collection overhead.
**Action:** Extract stateless utility objects like `TextEncoder` and `TextDecoder` into module-level singletons when they are used repeatedly within the same file.

## 2025-05-22 - Optimized node lookup in NodeEngine execution loop
**Learning:** In the NodeEngine execution loop, repeatedly searching for a node by ID in the `nodes` array using `Array.prototype.find` resulted in O(M * N) complexity, where M is the number of steps in the execution order and N is the total number of nodes.
**Action:** Index the `nodes` array into a `Map` keyed by `id` before the loop to reduce lookup time to O(1) per step, achieving an overall complexity of O(M + N). This provided a ~60x speed improvement in benchmarks with 10,000 nodes.