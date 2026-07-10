1. **Fix tests requiring `id` for `SchemaField` in `src/lib/flattenRelations.test.ts` and `src/lib/migration.test.ts` and `src/lib/templateExport.test.ts`:**
   Use the `replace_with_git_merge_diff` tool to update those files so that their mock `SchemaField` arrays include `id: '1'`, `id: '2'`, etc.

2. **Fix `useLedgerData.test.ts` and `useLiveQuery.test.ts` duplicate imports and type errors:**
   Use the `replace_with_git_merge_diff` tool to fix the duplicate `useProfileStore` imports and the `.getState()`/`.mockReturnValueOnce()` typings in the `tests/features/nodeEditor/useLedgerData.test.ts` and `tests/features/nodeEditor/useLiveQuery.test.ts`.

3. **Fix `useNodeStore.ts` type error:**
   Use `replace_with_git_merge_diff` to fix `(CanvasNode | Node)[]` type mismatch.

4. **Fix `hydration.integration.test.ts` and `schemaChangeHandler.test.ts` type errors:**
   Use `replace_with_git_merge_diff` to add missing `type: "text"` or cast `as FieldType` to fix `FieldType` enum incompatibility.

5. **Run Tests & Verify:**
   Use `run_in_bash_session` to execute `pnpm tsc --noEmit` and iteratively fix any remaining CI type check errors until it passes.

6. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

7. **Submit the Code:**
   Use the `submit` tool to push changes.
