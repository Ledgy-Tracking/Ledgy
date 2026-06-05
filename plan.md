1. **Optimize `validateContainerIntegrity`:**
   - Modify `src/features/nodeEditor/utils/validateContainerIntegrity.ts` to replace multiple O(N) `find()` operations inside array iterations with an O(1) Map lookup.
   - Specifically, index `nodes` into a Map (`const nodesById = new Map(nodes.map(n => [n.id, n]));`) and use it for quick lookups during orphaned children checks, missing children checks, and circular reference checks.
2. **Verify changes:**
   - Run `pnpm run build` and `pnpm test` to ensure functionality and tests still pass.
3. **Pre-commit steps:**
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
4. **Submit PR:**
   - Submit the PR with the title formatted as "⚡ Bolt: [performance improvement]" detailing the optimization in the description.
