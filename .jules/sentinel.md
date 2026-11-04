## 2024-05-18 - Insecure Randomness in UUID Generation
**Vulnerability:** Weak fallback for UUID generation using `Math.random()` in `src/features/nodeEditor/NodeCanvas.tsx`. `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG), potentially leading to predictable node IDs and node collisions or state injection if predictability is exploited.
**Learning:** Even though `crypto.randomUUID()` is preferred, the fallback used `Math.random()`. Instead of manual insecure fallback generation, a trusted library like `uuid` which guarantees better randomness guarantees should be used.
**Prevention:** Use `import { v4 as uuidv4 } from 'uuid'` for reliable and secure UUID generation across the application, rather than custom manual implementations with `Math.random()`.

## 2024-05-18 - Insecure Randomness in UUID Generation
**Vulnerability:** Weak fallback for UUID generation using `Math.random()` in `src/features/nodeEditor/NodeCanvas.tsx`. `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG), potentially leading to predictable node IDs and node collisions or state injection if predictability is exploited.
**Learning:** Even though `crypto.randomUUID()` is preferred, the fallback used `Math.random()`. Instead of manual insecure fallback generation, a trusted library like `uuid` which guarantees better randomness guarantees should be used.
**Prevention:** Use `import { v4 as uuidv4 } from 'uuid'` for reliable and secure UUID generation across the application, rather than custom manual implementations with `Math.random()`.
