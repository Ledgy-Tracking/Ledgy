# 🎯 STORY CONTEXT QUALITY REVIEW - Story 3-14

**Ghost Reference Fallback Rendering — The UI safety mechanism preventing crashes when a cell points to a deleted UUID**

---

## Executive Summary

**Critical Issues Found:** 5  
**Enhancement Opportunities:** 6  
**LLM Optimizations:** 4  

**Overall Quality:** **GOOD with significant gaps** — Story is architecturally sound but has critical implementation gaps, missing acceptance criteria edge cases, and ambiguous technical descriptions that could cause developer mistakes.

---

## 🚨 CRITICAL ISSUES (Must Fix)

### 1. **AC 8 LOGIC INVERTED — BackLinksPanel must handle ghost entries as TARGETS, not sources**
- **What's wrong:** AC 8 states: *"If a backlink source entry is soft-deleted, it should appear as 'ghost' or excluded..."*
  - This is backwards. The backlink **source** is the entry linking OUT to other entries. If source is deleted, backlinks naturally disappear.
  - The real risk is when the **target entry being viewed in BackLinksPanel is soft-deleted** — but that's impossible because we're viewing it.
  - The actual ghost-reference scenario in BackLinksPanel is: **an entry in the backlink list points to a deleted target** (i.e., entry A once linked to B, now B is deleted, A still shows the ghost).
- **Why it matters:** Developer will implement the wrong logic. BackLinksPanel already filters entries correctly; the issue is that listed entries might themselves CONTAIN relation fields pointing to deleted entries — those should show as ghosts.
- **Specific fix needed:**
  ```
  BEFORE (AC 8):
  "If a backlink source entry is soft-deleted, it should appear as 'ghost' or excluded from the BackLinksPanel display"
  
  AFTER (AC 8 - CORRECTED):
  "Ghost references within BackLinksPanel entries are handled correctly: if a backlink source entry contains relation fields pointing to deleted targets, those relations render as ghosts (line-through, disabled) within the BackLinksPanel display"
  ```

### 2. **CRITICAL GAP: Story doesn't specify which ledger to check for deletedEntryIds**
- **What's wrong:** AC 1 says "if the target entry ID exists in `deletedEntryIds` memoized set" but doesn't explain:
  - Which ledger's deletedEntryIds to use?
  - The current code checks `field.relationTarget` ledger (correct), but story doesn't explain this.
  - If a relation field references Ledger A, but entry is in Ledger B, dev must look in Ledger A's deletedEntryIds.
- **Why it matters:** Developer might check the current ledger's deletedEntryIds instead of the target ledger's, causing ghost detection to fail.
- **Specific fix needed:**
  ```
  ADD to AC 1:
  "The target ledger is determined by the schema field's relationTarget property. 
   Only entries deleted in the TARGET ledger are marked as ghosts."
  ```

### 3. **MISSING: Story doesn't document relationCombobox filtering in InlineEntryRow**
- **What's wrong:** Story AC 2 says "RelationTagChip already accepts isGhost prop" but completely skips that **InlineEntryRow's RelationCombobox must filter or mark deleted entries during entry creation/editing**.
  - AC 2.2 Task mentions "Update InlineEntryRow's RelationCombobox rendering to highlight/disable ghost targets" but provides NO acceptance criteria or details.
  - Story doesn't explain: should deleted entries be filtered out entirely, marked with strikethrough, or disabled?
  - No guidance on how to pass the `deletedEntryIds` set to RelationCombobox.
- **Why it matters:** Developer will implement ComboBox ghost handling incorrectly or incompletely. Criteria are mandatory, not optional tasks.
- **Specific fix needed:**
  - **ADD new AC 11:** "Ghost entries in RelationCombobox (during create/edit) render with:
    - Strikethrough text
    - Zinc-500 text color
    - Optional: `disabled-combobox-item` cursor to indicate selection leads to ghost
    - Can still be selected (don't filter them out)"
  - **Add to AC 2:** "InlineEntryRow loads deletedEntryIds from the target ledger schema and passes isGhost flag to RelationCombobox for each entry"

### 4. **INCOMPLETE EDGE CASE: AC 7 doesn't specify multi-relation ghost behavior in InlineEntryRow**
- **What's wrong:** AC 7 says "relation fields with deleted targets show ghosts correctly in the combobox or inline edit context" but doesn't clarify:
  - If editing an entry that already has a deleted target selected, what does it look like?
  - Can users deselect and re-select a ghost entry?
  - Does the chip appearance match LedgerTable's ghost styling?
- **Why it matters:** Edge case testing will be incomplete. Code review will find inconsistencies.
- **Specific fix needed:**
  ```
  EXPAND AC 7 to:
  "When editing an existing entry with a relation field that currently points to a deleted entry:
   - The deleted entry ID renders as a ghost chip (line-through, zinc-500, disabled)
   - User can remove the ghost reference
   - User can add new (non-deleted) references alongside the ghost
   - The ghost reference is preserved in the form data until explicitly removed"
  ```

### 5. **CRITICAL AMBIGUITY: Story doesn't explain when deletedEntryIds Set should be populated/updated**
- **What's wrong:** Story mentions `deletedEntryIds` memoized set at line 58-72 but doesn't clarify:
  - Is this Set computed ONCE on component mount, or does it re-compute when entries change?
  - If entry is soft-deleted AFTER LedgerTable renders, does the ghost appear on re-render?
  - Does the memoization dependency include `allEntries`? (Answer: YES, but story doesn't explain)
- **Why it matters:** Developer might create a stale cache of deletedEntryIds, causing ghosts to not appear after delete, or cause unnecessary re-renders.
- **Specific fix needed:**
  ```
  ADD to Dev Notes (Architecture Guardrails):
  "deletedEntryIds memoization recomputes whenever:
   - A new entry is soft-deleted (isDeleted flag changed in allEntries)
   - The schema changes (new relation fields added)
   - Focus moves to a different ledger (schemaId changes)
   
   The Set is scoped to relation target schemas only (line 61-63).
   Performance: O(n) per relation-target ledger, but only runs when dependencies change."
  ```

---

## ⚡ ENHANCEMENT OPPORTUNITIES (Should Add)

### 1. **Missing data consistency requirement: Ghost entries after soft-delete → hard delete lifecycle**
- **What's missing:** Story doesn't clarify behavior when entry transitions from soft-deleted to hard-deleted (purged from DB):
  - Should ghosts disappear entirely?
  - If a relation field points to a hard-deleted entry, do we see an error, or still render as ghost?
  - Story 3-13 mentions `find_entries_with_relation_to` fallback query — should this be triggered for ghosts?
- **Why it matters:** For robustness. What if sync deletes a target entry completely before local soft-delete is processed?
- **Specific addition needed:**
  ```
  ADD new AC 12:
  "Hard deletion resilience — If a target entry is hard-deleted from the database 
   (not just soft-deleted), the relation still renders gracefully:
   - Renders as ghost with strikethrough (same appearance as soft-delete)
   - No error logs or crashes
   - No console warnings"
  ```

### 2. **Missing: Bulk selection + bulk action behavior with ghosts**
- **What's missing:** AC 6 says "Ghost references remain selectable via checkbox" but doesn't specify:
  - Can user bulk-edit a ghost entry (e.g., mass delete)?
  - Can user apply bulk actions to entries CONTAINING ghosts?
  - Does the bulk action bar show a warning or indication when ghosts are selected?
- **Why it matters:** UX clarity. User might expect ghosts to be read-only or auto-excluded from bulk operations.
- **Specific addition needed:**
  ```
  ADD to AC 6:
  "Bulk operations are allowed on ghost entries or entries containing ghost relations:
   - User can bulk-delete entries that contain ghost references
   - Ghost references within entries are not specially filtered or hidden during bulk operations
   - No bulk 'cleanup ghosts' operation exists (that's a future feature, not in scope)"
  ```

### 3. **Missing: Accessibility requirements for ghosts**
- **What's missing:** Story doesn't mention ARIA labels, screen-reader handling, or keyboard navigation for ghost entries:
  - Should ghost buttons have `aria-disabled="true"` in addition to `disabled` attr?
  - Should screen readers announce "ghost reference" or "deleted reference"?
  - Can keyboard users tab to ghost entries? (Currently yes, button is disabled, but story doesn't clarify intent)
- **Why it matters:** WCAG 2.1 AA compliance. Missing from acceptance criteria.
- **Specific addition needed:**
  ```
  ADD new AC 13:
  "Accessibility — Ghost references are accessible:
   - Ghost buttons have disabled={true} and aria-disabled='true'
   - RelationTagChip ghost chip has title='This entry has been deleted'
   - Screen readers should read: '<entry-id> deleted reference'
   - Keyboard users can tab to ghost entries but cannot activate them (Enter does nothing)"
  ```

### 4. **Missing: Schema migration edge case**
- **What's missing:** AC 4.4 says "Test ghost rendering after schema migration" but Task 4 doesn't explain:
  - If schema_version bump changes relation target field name, how are ghosts handled?
  - If a relation field is removed from schema (but entries still have old data), do ghosts still appear?
  - Story 3-6 (Schema Migration JIT Engine) might recompute entries — does this trigger deletedEntryIds invalidation?
- **Why it matters:** Data integrity. Ghost state must survive schema evolution.
- **Specific addition needed:**
  ```
  ADD to Task 4.4:
  "After schema_version migration:
   - Run JIT migration on sample entries (via story 3-6 logic)
   - Verify deletedEntryIds Set is correctly invalidated
   - Verify ghosts still render correctly if target ledger schema changed
   - If relation field removed from schema, ghosts should not appear (validate this)"
  ```

### 5. **Missing: Performance warning for large deleted-entry sets**
- **What's missing:** Story mentions "Memoization is critical" but doesn't warn about performance implications:
  - If a ledger has 10,000 deleted entries, deletedEntryIds Set memory footprint is ~10KB (acceptable)
  - But computing this Set every render (if deps change) could be expensive
  - Story doesn't mention: what if allEntries changes thousands of times during sync?
- **Why it matters:** Sync operations can invalidate memoization frequently. Developer should know to profile.
- **Specific addition needed:**
  ```
  ADD to Dev Notes (Architecture Guardrails) — Performance:
  "deletedEntryIds recomputation timing:
   - Memoization ensures no waste during scroll/selection changes
   - Potential bottleneck: if sync changes allEntries frequently, Set recomputes each time
   - Profiling recommendation: check Task 4.3 (large dataset test)
   - If > 100ms render detected, consider debouncing allEntries updates or splitting into sub-ledgers"
  ```

### 6. **Missing: Relation field rendering fallback for relationTarget mismatch**
- **What's missing:** Story assumes schema field has valid `relationTarget` property but doesn't handle:
  - What if relationTarget is undefined or points to non-existent schema?
  - Current code in LedgerTable line 635 passes `field?.relationTarget` to RelationTagChip
  - RelationTagChip might navigate to wrong ledger if relationTarget is stale
- **Why it matters:** Broken relational links. If schema is corrupted, ghost detection fails silently.
- **Specific addition needed:**
  ```
  ADD to AC 9:
  "Schema validation — Relation fields always have valid relationTarget:
   - If schema.field.relationTarget is undefined or null, log warning (not error)
   - RelationTagChip does NOT navigate on ghost click (already handled)
   - If navigationTarget is invalid, ghost state still renders correctly (fails safe)"
  ```

---

## ✨ OPTIMIZATIONS & SUGGESTIONS

### LLM Token Optimization

#### 1. **AC 3 (Visual Styling) is too verbose — can be concise table**
- **Current:** 7 lines of text describing four style properties
- **Suggested format:**
  ```
  AC 3: Visual styling for ghosts:
  | Property          | Value           |
  | Background        | zinc-800        |
  | Border            | zinc-700        |
  | Text color        | zinc-500        |
  | Decoration        | line-through    |
  | Cursor            | not-allowed     |
  | External icon     | Hidden          |
  ```
  **Saves:** ~15% of token usage for this AC; more scannable for dev agent

#### 2. **Dev Notes section has redundant imports section — consolidate**
- **Current:** "Code Patterns Established" lists 4 stories with extracted patterns (lines 80-96)
- **Issue:** Takes 17 lines to describe content already in other story files
- **Suggested:** Replace with:
  ```
  **Related Stories & Patterns:**
  - Story 3.13 (Bidirectional Link Writing): soft-delete semantics (isDeleted flag)
  - Story 3.9 (Inline Entry Row): keyboard-first FieldInput + RelationCombobox
  - Story 3.8 (Header Sorting): memoization for performance
  [Links to full story files for deeper learning]
  ```
  **Saves:** ~40% of tokens; reader can jump to source if needed

#### 3. **Testing Standards Summary is generic boilerplate — remove or truncate**
- **Current:** Lines 116-122 repeat project-context.md testing rules
- **Issue:** Distracts from story-specific concerns
- **Suggested:** Replace with:
  ```
  **Testing Conventions:**
  Per project-context.md: all tests in /tests, Vitest for unit, Playwright for E2E.
  Target coverage: 80% on ghost detection logic.
  ```
  **Saves:** ~30% of context; reader already knows general testing rules

#### 4. **Git Intelligence section is useful but could be more concise**
- **Current:** Lines 146-160 include 5 commits with explanations (15 lines)
- **Issue:** Repeats information already in task description
- **Suggested:** Replace with:
  ```
  **Commit Pattern:** `feat(story-3.14): implement ghost reference fallback rendering`
  Then code-review fixes in separate `fix(story-3.14): resolve review findings`
  ```
  **Saves:** ~25% of tokens; essential info is distilled

---

### Clarity & Ambiguity Issues

#### 1. **"Ghost references remain selectable via checkbox in bulk-edit mode" (AC 6) — specify what this means**
- **Ambiguous:** Does "selectable via checkbox" mean:
  - (A) Users can checkbox a ghost entry and include it in bulk operations, OR
  - (B) Users can checkbox within a ghost cell (e.g., multi-select within a ghost chip)?
- **Likely intent:** (A) — but should say: "Ghost entries can be selected via bulk-selection checkbox (not filtered out)"
- **Fix:** Reword AC 6 to: "Entries containing ghost relation fields remain selectable for bulk operations; they are not excluded from bulk-selection checkboxes."

#### 2. **"No console warnings" (AC 10) — too vague**
- **Ambiguous:** Does this mean:
  - (A) No warnings during normal rendering, OR
  - (B) No warnings even if deletedEntryIds computation fails?
- **Better phrasing:** "Ghost detection and rendering do NOT emit console.warn() or console.error() during normal operation. Any errors are surfaced through useErrorStore, not console."

#### 3. **"Schema-aware ghost detection" (AC 9) — unclear scope**
- **Current wording:** "Ghosts are only checked for relation field types; non-relation fields ignore the deleted state."
- **Issue:** Doesn't explain what "ignore the deleted state" means. Does it mean:
  - (A) Non-relation fields never render as ghosts, OR
  - (B) If a deleted entry has non-relation field data, we ignore it?
- **Better phrasing:** "Ghost detection applies ONLY to relation field types. Other field types (text, number, date, etc.) never render as ghosts, regardless of target entry's deleted status."

---

### Code Reality Check

#### 1. **RelationCombobox doesn't currently support isGhost prop**
- **Found:** RelationCombobox.tsx lines 37-45 do NOT accept an `isGhost` or `deletedEntryIds` prop
- **Current props:** `entries, value, onChange, placeholder, allowMultiple, getDisplayValue, onKeyDown`
- **Missing:** No mechanism to mark/disable deleted entries in the dropdown
- **Impact:** Task 2.2 ("Update InlineEntryRow's RelationCombobox rendering") will require NEW prop additions to RelationCombobox
- **Specific action needed:** 
  ```
  ADD to Dev Tasks:
  Task 2.1.5 — Extend RelationCombobox component to accept `deletedEntryIds?: Set<string>` prop
    - When rendering combobox options, check each entry._id against deletedEntryIds
    - If deleted, wrap entry in ghost-styled container (zinc-500 text, strikethrough)
    - Do NOT filter out deleted entries (keep them selectable)
  ```

#### 2. **BackLinksPanel.tsx doesn't filter or mark deleted backlink sources**
- **Found:** Lines 44-52 render backlink entries WITHOUT checking their isDeleted flag
- **Current logic:** Simply maps over `entries` array from backLinks store
- **Missing:** No AC implementation for filtering/marking soft-deleted backlink sources
- **Impact:** If a soft-deleted entry still appears in backlinks, it will render normally (not as ghost)
- **Specific action needed:**
  ```
  ADD to Dev Tasks:
  Task 2.3.1 — Update BackLinksPanel to mark deleted backlink sources
    - Add isDeleted check: if entry.isDeleted === true, render BackLinkItem with a ghost indicator
    - OR: Filter out soft-deleted entries entirely (choice depends on UX preference)
    - AC 8 needs clarification on which approach is correct
  ```

#### 3. **LedgerTable correctly computes deletedEntryIds but needs deletion target filter**
- **Found:** Lines 56-72 correctly memoize deletedEntryIds with proper dependencies
- **Current scope:** Line 62 filters to relation-target schemas ONLY (correct)
- **Issue:** Line 629 checks `deletedEntryIds?.has(v)` but hasDeletedTarget should check PER VALUE
- **Code review detail:** Line 629 is correct — it's checking if ANY value is deleted. But clarity could improve:
  ```
  CURRENT (line 629):
  const hasDeletedTarget = values.some(v => deletedEntryIds?.has(v));
  
  CLEARER:
  const deletedTargets = values.filter(v => deletedEntryIds?.has(v));
  const isGhost = deletedTargets.length > 0;  // Easier to understand: "is any target deleted?"
  ```

#### 4. **RelationTagChip correctly implements isGhost styling**
- **Found:** Lines 61-69 apply correct Tailwind classes for ghost state
- **Classes used:** `bg-zinc-800 border-zinc-700 text-zinc-500 line-through cursor-not-allowed`
- **✓ VERIFIED:** Matches AC 3 styling requirements exactly
- **✓ VERIFIED:** `disabled={isGhost}` prevents navigation (AC 5)
- **✓ VERIFIED:** Line 69 conditionally hides ExternalLink icon (AC 3)
- **No issues found**

---

### Architecture & Pattern Consistency

#### 1. **Story doesn't mention error handling for missing target ledger entries**
- **Pattern established in 3-13:** "All rendering errors must propagate through global error store pattern"
- **Missing in 3-14:** No mention of error handling if `allEntries[targetSchemaId]` is undefined
- **Current code (line 65):** `(allEntries[targetSchemaId] || []).forEach(...)` safely handles missing ledger
- **But story should document:** What if target ledger is never fetched? Should error be logged?
- **Suggestion:** Add to Dev Notes: "If target ledger entries not yet loaded, deletedEntryIds Set will be empty (safe default). Once entries load, Set updates automatically via memoization deps."

#### 2. **Memoization dependency correctness not verified in story**
- **Pattern from 3-8:** "Memoization is critical: use useMemo for derived data"
- **Code dependency array (line 72):** `[allEntries, schema]`
- **Question:** Should this include `sortConfig` or `selectedRow`? 
- **Answer:** NO — deletedEntryIds is data-independent of UI state (sorting, selection)
- **Story doesn't clarify this:** Developer might add unnecessary deps, causing excessive recomputation
- **Suggestion:** Add to Dev Notes: "deletedEntryIds dependency array is intentionally minimal: only allEntries and schema matter. UI state (sort, selection) must NOT be dependencies."

#### 3. **Story mentions "relationTarget schema field" but doesn't document required schema structure**
- **Missing:** Story doesn't show required SchemaField shape for relation types
- **Expected shape (from code line 62):** `{ type: 'relation', relationTarget: 'schema:other-ledger-id' }`
- **What if relationTarget is missing?** Code doesn't validate
- **Suggestion:** Add to Dev Notes:
  ```
  **Schema Field Contract for Relations:**
  type: 'relation' fields MUST include relationTarget property pointing to target schema ID.
  Ghost detection skips relation fields with undefined relationTarget.
  Validation of this constraint is handled by schema validation layer (Story 3-2).
  ```

---

## 📋 Summary of Required Changes

### MUST FIX (before dev-story):

1. **AC 8** — Correct the logic: ghosts in BackLinksPanel are entries WITHIN backlinks with deleted targets, not deleted backlink sources
2. **AC 1** — Add: "Ghost detection uses the target ledger (relationTarget) to check deletedEntryIds, not current ledger"
3. **AC 2** — Split: Create AC 11 for InlineEntryRow's RelationCombobox ghost rendering
4. **AC 7** — Expand: Specify editing existing entries with deleted targets behavior
5. **Dev Notes** — Add: "deletedEntryIds memoization triggers and dependencies explained"

### SHOULD ADD (improves developer clarity):

6. **AC 12** — Hard deletion resilience requirement
7. **AC 6 clarification** — Bulk operations allowed on ghost entries
8. **AC 13** — Accessibility requirements
9. **Task 4.4** — Schema migration edge case details
10. **Dev Notes** — Performance warning for large deleted-entry sets

### OPTIMIZE (reduce token waste):

11. Consolidate AC 3 into table format
12. Shorten Dev Notes "Code Patterns Established" section
13. Remove generic "Testing Standards Summary" boilerplate
14. Truncate "Git Intelligence" section to essential pattern only
15. Clarify ambiguous AC wording (AC 6, 9, 10)

### NEW TASKS (discovered gaps):

16. **Add Task 2.1.5** — Extend RelationCombobox to accept deletedEntryIds prop and render ghost options
17. **Add Task 2.3.1** — Update BackLinksPanel to mark/filter deleted backlink sources (pending AC 8 clarification)

---

## Final Verdict

**READY FOR DEV with mandatory revisions.** The story is architecturally sound and correctly identifies the memoization pattern and visual styling. However, **5 critical gaps must be fixed**:

1. AC 8 logic is inverted
2. Ghost detection ledger scope is undocumented
3. InlineEntryRow's RelationCombobox handling is missing from ACs
4. Editing existing entries with ghosts is underspecified
5. Memoization trigger conditions are unexplained

**Estimated implementation time with current story:** 6-8 hours (includes discovery of gaps)  
**Estimated implementation time with fixes applied:** 4-5 hours (developer has clear guidance)

**Recommendation:** Apply mandatory fixes, then mark ready-for-dev.
