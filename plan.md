1. **Fix `LedgerSourceNode.tsx` type errors:**
   Use the `replace_with_git_merge_diff` tool to update `src/features/nodeEditor/nodes/LedgerSourceNode.tsx`:
   - Change `portColorMap[field.type]` to `portColorMap[field.type as PortType]` to fix the indexing error on line 582.
   - Remove the invalid `title` prop from the `AlertTriangle` component on line 261.
   - Remove unused imports `hydrateLedgerWithGhosts` and `getGhostDisplayInfo` on line 14.
   - Remove unused `index` from `ghosts.slice(0, 3).map((ghost, index) => (` on line 450.

2. **Fix `useLiveQuery.ts` type errors:**
   Use the `replace_with_git_merge_diff` tool to update `src/features/nodeEditor/hooks/useLiveQuery.ts` by renaming the unused parameter `change` to `_change` in the `handleChange` function on line 85.

3. **Fix `useHandlePositions.ts` type errors:**
   Use the `replace_with_git_merge_diff` tool to update `src/features/nodeEditor/hooks/useHandlePositions.ts` by removing the unused `DEFAULT_VIEWPORT_PADDING` import on line 16.

4. **Fix `useEdgeDrag.ts` type errors:**
   Use the `replace_with_git_merge_diff` tool to update `src/features/nodeEditor/hooks/useEdgeDrag.ts`:
   - Move the `cancelDrag` function declaration above `endDrag` to fix the 'used before declaration' error on line 199.
   - Remove the unused `touchStartRef` declaration on line 56 (since there's another declaration on line 289 that's actually used) and remove `REBUILD_THROTTLE_MS` on line 26.

5. **Verify changes:**
   Use `run_in_bash_session` to execute `git diff --cached` to verify the modifications.

6. **Run TypeScript Check:**
   Use `run_in_bash_session` to execute `pnpm test src/features/nodeEditor/components/ConnectionLine.test.tsx && pnpm test src/features/shell/AppShell.test.tsx && pnpm tsc --noEmit`.

7. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**

8. **Submit the Code:**
   Use the `submit` tool to push changes to the same branch `palette-appshell-aria-labels` with the original Palette PR title "🎨 Palette: Improve accessibility of AppShell toggle buttons" and the required description fields: 💡 What, 🎯 Why, 📸 Before/After, and ♿ Accessibility.
