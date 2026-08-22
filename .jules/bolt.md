## 2024-05-24 - Optimize TOTP verification loop
**Learning:** Checking the most likely valid time step (0 offset) first in `verifyTOTP` avoids unnecessary WebCrypto API calls for valid, on-time codes, speeding up verification by ~3x in the happy path.
**Action:** Always consider the order of operations in loops involving expensive cryptographic functions (like `crypto.subtle.importKey` and `crypto.subtle.sign`). Prioritize the "happy path" or most likely valid state to exit the loop early.

## 2024-05-24 - Pre-import CryptoKey outside expensive loops
**Learning:** `crypto.subtle.importKey` introduces a measurable overhead (~1ms) that adds up when placed inside a loop checking multiple permutations (such as the window tolerance loop in `verifyTOTP` checking multiple time offsets and algorithms).
**Action:** When performing repeated HMAC signing or other WebCrypto operations within a loop based on the same key material, either pass the pre-imported `CryptoKey` to the function or lazily load and cache it outside the loop.

## 2026-03-17 - Cache stateless objects to avoid GC pressure
**Learning:** Instantiating `new TextEncoder()` and `new TextDecoder()` frequently inside hot paths (like key derivation and crypto operations) introduces unnecessary object allocation and garbage collection overhead.
**Action:** Extract stateless utility objects like `TextEncoder` and `TextDecoder` into module-level singletons when they are used repeatedly within the same file.

## 2025-05-22 - Optimized node lookup in NodeEngine execution loop
**Learning:** In the NodeEngine execution loop, repeatedly searching for a node by ID in the `nodes` array using `Array.prototype.find` resulted in O(M * N) complexity, where M is the number of steps in the execution order and N is the total number of nodes.
**Action:** Index the `nodes` array into a `Map` keyed by `id` before the loop to reduce lookup time to O(1) per step, achieving an overall complexity of O(M + N). This provided a ~60x speed improvement in benchmarks with 10,000 nodes.

## 2026-03-22 - Optimized widget lookup in React Grid Layout handlers
**Learning:** In high-frequency layout handlers like `onLayoutChange` in `react-grid-layout`, using `Array.prototype.find` inside a loop over external data arrays causes $O(N^2)$ complexity. This can cause significant main thread blocking and jank when rearranging many widgets.
**Action:** Always index local state items (e.g., `widgets`) into a `Map` by identifier before the loop. This reduces lookup complexity from $O(N)$ to $O(1)$, converting the overall operation from $O(N^2)$ to $O(N)$.

## 2024-05-24 - Prevent widget re-renders with Zustand selectors
**Learning:** Destructuring entire state arrays (like `const { nodes } = useNodeStore()`) inside list components causes all items to re-render when any array element changes.
**Action:** Always use specific selector functions (e.g., `useNodeStore(state => state.nodes.find(n => n.id === id))`) in child components to isolate re-renders to only the elements whose specific state has changed.

## 2024-05-25 - Avoid Call Stack Limits with Math.max/min
**Learning:** Spreading large computation arrays into `Math.min(...values)` or `Math.max(...values)` causes "Maximum call stack size exceeded" errors in heavy worker computations. Use explicit `for` loops with `Number.isNaN()` checks to maintain NaN propagation parity with native Math behavior.

## 2024-05-26 - Single-pass loop optimization for data extraction
**Learning:** In data processing pipelines like `NodeEngine`, chaining array methods such as `.map().filter()` over potentially large arrays creates redundant iterations and intermediate array allocations, significantly degrading performance on large datasets.
**Action:** Replace chained `.map().filter()` or similar array reduction chains with a single-pass `for` loop to avoid intermediate allocations and reduce total O(N) operations.

## 2024-05-27 - Avoid Array.push(...largeArray) due to Maximum call stack size exceeded
**Learning:** Spreading very large arrays into `Array.prototype.push(...largeArray)` (e.g. over 100k items) results in V8 throwing a "Maximum call stack size exceeded" error. This is because V8 engine treats the spread arguments as individual function arguments.
**Action:** When concatenating large arrays, avoid using the spread syntax `push(...array)`. Instead, use a `for` loop to explicitly iterate and push items one by one. This completely avoids the call stack limitation and is highly performant.
## 2025-05-28 - ReactFlow Viewport Optimization
**Learning:** ReactFlow's `useStore(s => s.transform)` triggers continuous 60fps re-renders during panning/zooming. Using `useOnViewportChange({ onEnd: ... })` debounces this, but requires careful initialization using `getViewport()` from `useReactFlow` to preserve the initial canvas state (e.g., from `fitView`).
**Action:** When needing viewport updates, use `useOnViewportChange` over direct store subscriptions. Always initialize local viewport state using `getViewport()` to avoid overriding the initial diagram coordinates with defaults.
## 2026-08-22 - Omit base property in extended props
**Learning:** When extending types that have a built-in property (e.g. `ConnectionLineComponentProps` with `connectionStatus: 'valid' | 'invalid' | null`), redefining the same property with an incompatible type (e.g. adding 'default' and omitting null) will cause a TS2430 compilation error because the extended interface incorrectly extends the base interface.
**Action:** When intentionally modifying a built-in property on an extended interface, always `Omit` the original property first (e.g., `interface ExtendedProps extends Omit<BaseProps, 'theProp'> { theProp: newType }`).
## 2026-08-22 - React Flow v12 onConnectStart Signature
**Learning:** In @xyflow/react, `onConnectStart` expects `(event: MouseEvent | TouchEvent, params: OnConnectStartParams) => void`. Previous versions or loose typings may have used a single params object.
**Action:** When defining `onConnectStart` in React Flow, always include the event as the first parameter to satisfy strict TypeScript typings.
## 2026-08-22 - Radix UI Dialog wrapper usage
**Learning:** The root `<Dialog>` component from Radix UI does not accept DOM attributes like `className`, `role`, `aria-modal`, or `aria-labelledby`. These attributes belong on the `<DialogContent>` or should be omitted as Radix handles accessibility internally.
**Action:** Never pass DOM attributes to the root `<Dialog>` component. Also, prefer controlling visibility via the `open` prop rather than returning `null`.
