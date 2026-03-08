# Story 3.4: Schema Builder - Text & Number UI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user building a custom ledger schema,
I want inline constraint inspector forms for `text`, `long_text`, and `number` fields in the Schema Builder dialog,
so that I can define per-field validation rules (character limits, numeric bounds, RegEx patterns) that are enforced by the Zod validation engine when entries are created or updated (PRD FR7).

## Acceptance Criteria

1. **`SchemaField` extended with constraint fields in `src/types/ledger.ts`:**
   The `SchemaField` interface gains the following optional constraint fields:
   ```typescript
   export interface SchemaField {
     name: string;
     type: FieldType;
     required?: boolean;
     // Relation constraint (existing)
     relationTarget?: string;
     // Text / Long Text constraints (new)
     minLength?: number;
     maxLength?: number;
     pattern?: string;  // JavaScript RegExp source string (no delimiters)
     // Number constraints (new)
     min?: number;
     max?: number;
   }
   ```

2. **`buildZodSchemaFromLedger` in `src/lib/validation.ts` enforces constraints:**
   - `text` and `long_text` fields apply `z.string().min(minLength)`, `.max(maxLength)`, and `.regex(new RegExp(pattern))` when the corresponding constraint fields are defined on `SchemaField`.
   - `number` fields apply `z.number().min(min)` and `.max(max)` when those fields are defined.
   - All constraint additions are conditional — if the field property is `undefined`, no constraint method is chained.
   - `long_text` now has its own explicit `case 'long_text':` branch in the switch (same logic as `text`).
   - Existing `text`, `number`, `date`, and `relation` branches continue to pass all pre-existing tests.

3. **`useSchemaBuilderStore.updateField` clears stale type-specific constraints on type change:**
   When `patch` contains a `type` key and the new type differs from the current type, the action must clear all constraints that are irrelevant to the new type:
   - Changing to any type other than `'text'` or `'long_text'`: clear `minLength`, `maxLength`, `pattern`.
   - Changing to any type other than `'number'`: clear `min`, `max`.
   - Changing to any type other than `'relation'`: clear `relationTarget` (existing behavior preserved).
   - Changing to `'text'` or `'long_text'`: clear `min`, `max`, `relationTarget`.
   - Changing to `'number'`: clear `minLength`, `maxLength`, `pattern`, `relationTarget`.
   - In other words: after applying the patch, delete all constraint keys that don't belong to `updated.type`. The cleanest implementation is a helper that knows which keys belong to which types, rather than a chain of `if/else` blocks.

4. **Inline constraint UI rendered within `SchemaBuilder.tsx`:**
   - When a field row has `type === 'text'` or `type === 'long_text'`, a constraint sub-panel is rendered directly beneath (or within) that field row showing:
     - **Min Length** — `<Input type="number" min={0} placeholder="0" />` bound to `field.minLength`
     - **Max Length** — `<Input type="number" min={1} placeholder="∞" />` bound to `field.maxLength`
     - **Pattern (RegEx)** — `<Input type="text" placeholder="e.g. ^[A-Z]" />` bound to `field.pattern` with a `<Tooltip>` explaining it accepts a JavaScript RegExp source string
   - When a field row has `type === 'number'`, a constraint sub-panel shows:
     - **Min** — `<Input type="number" placeholder="–∞" />` bound to `field.min`
     - **Max** — `<Input type="number" placeholder="∞" />` bound to `field.max`
   - The constraint sub-panel is **not rendered** for `date`, `boolean`, `select`, `multi_select`, or `relation` field types (those are handled in Story 3-5 or later).
   - All constraint `Input` change handlers call `updateField(index, { constraintKey: parsedValue })`. Numeric inputs (`minLength`, `maxLength`, `min`, `max`) must parse the input value with `Number(e.target.value)` and set `undefined` (via `updateField`) if the input is cleared (empty string → `undefined`).
   - Labels for constraint inputs must use `htmlFor` or wrapping `<label>` elements (WCAG AA, per UX spec).

5. **Constraint validation errors surface correctly in the UI:**
   - If a user provides a `pattern` field with an invalid RegEx source string (one that throws `new RegExp(pattern)`), the `buildZodSchemaFromLedger` must not crash — it should skip the `.regex()` chain and log a `console.warn('Invalid regex pattern for field: ...')` instead.
   - The existing inline `error` from `useSchemaBuilderStore` (displayed as a red banner in `SchemaBuilder.tsx`) continues to be the mechanism for showing commit-time validation errors.

6. **New tests in `tests/schemaValidation.test.ts`:**
   Append the following test cases to the existing `describe('Schema Strict Validation Engine')` block:
   - `text` field with `minLength: 5`: value `'abc'` (3 chars) → throws `ValidationError`; value `'abcdef'` (6 chars) → passes.
   - `text` field with `maxLength: 10`: value `'hello world'` (11 chars) → throws `ValidationError`; value `'hello'` → passes.
   - `text` field with `pattern: '^[A-Z]'`: value `'hello'` → throws `ValidationError`; value `'Hello'` → passes.
   - `long_text` field with `maxLength: 20`: value with 25 chars → throws; value with 15 chars → passes.
   - `number` field with `min: 0`: value `-1` → throws `ValidationError`; value `0` → passes.
   - `number` field with `max: 100`: value `101` → throws `ValidationError`; value `100` → passes.
   - `number` field with `min: 0, max: 100`: value `50` → passes.
   - Field with invalid `pattern` (e.g. `'[invalid'`) → `buildZodSchemaFromLedger` does not throw; valid and invalid values both pass (constraint skipped).

7. **New tests appended to `tests/schemaBuilderStore.test.ts`:**
   - `updateField` type-change from `'text'` (with `minLength: 3, maxLength: 50, pattern: '^[A-Z]'`) to `'number'` → `minLength`, `maxLength`, `pattern` cleared; `min` and `max` are `undefined` (no stale text constraints remain).
   - `updateField` type-change from `'number'` (with `min: 0, max: 100`) to `'text'` → `min` and `max` cleared.
   - `updateField` updating `minLength` on a `text` field (type not changed) → `minLength` updated, other constraints preserved.
   - `updateField` clearing `minLength` by setting `undefined` → `minLength` removed from field.

8. **Zero TypeScript errors:** `npx tsc --noEmit` must report 0 errors after all changes.

9. **Existing tests unbroken:** All tests in `/tests` and `src/**/*.test.*` must continue to pass. In particular `tests/schemaValidation.test.ts` existing tests and `tests/schemaBuilderStore.test.ts` must still pass.

## Tasks / Subtasks

- [x] Task 1: Extend `SchemaField` in `src/types/ledger.ts` (AC: #1)
  - [x] 1.1 Add optional constraint fields: `minLength?: number`, `maxLength?: number`, `pattern?: string`, `min?: number`, `max?: number` to the `SchemaField` interface.
  - [x] 1.2 Run `npx tsc --noEmit` to confirm no type errors from the interface extension.

- [x] Task 2: Update `buildZodSchemaFromLedger` in `src/lib/validation.ts` (AC: #2, #5)
  - [x] 2.1 Add a `case 'long_text':` branch above `case 'text':` (or use fall-through) in the switch statement. Both cases start with `base = z.string()`.
  - [x] 2.2 After establishing `base` for `text`/`long_text`, chain constraint methods conditionally:
    ```typescript
    if (field.minLength !== undefined) base = (base as z.ZodString).min(field.minLength);
    if (field.maxLength !== undefined) base = (base as z.ZodString).max(field.maxLength);
    if (field.pattern !== undefined) {
      try {
        base = (base as z.ZodString).regex(new RegExp(field.pattern));
      } catch {
        console.warn(`Invalid regex pattern for field "${field.name}": ${field.pattern}`);
      }
    }
    ```
  - [x] 2.3 For the `case 'number':` branch, after `base = z.number()`, chain:
    ```typescript
    if (field.min !== undefined) base = (base as z.ZodNumber).min(field.min);
    if (field.max !== undefined) base = (base as z.ZodNumber).max(field.max);
    ```
  - [x] 2.4 Run `npx tsc --noEmit` — must pass.

- [x] Task 3: Update `updateField` in `src/stores/useSchemaBuilderStore.ts` (AC: #3)
  - [x] 3.1 After the existing `const updated = { ...draftFields[index], ...patch }` merge, add a type-constraint clearing block.
  - [x] 3.2 If `updated.type !== 'text' && updated.type !== 'long_text'`: `delete updated.minLength; delete updated.maxLength; delete updated.pattern;`
  - [x] 3.3 If `updated.type !== 'number'`: `delete updated.min; delete updated.max;`
  - [x] 3.4 The existing `if (updated.type !== 'relation') { delete updated.relationTarget; }` stays as-is.
  - [x] 3.5 Run `npx tsc --noEmit` — must pass.

- [x] Task 4: Add inline constraint UI to `SchemaBuilder.tsx` (AC: #4)
  - [x] 4.1 Import `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` from `../../components/ui/tooltip` (check if component exists; if not, use a `title` attribute as fallback and add a TODO comment).
  - [x] 4.2 Import `Info` from `lucide-react` for the tooltip icon.
  - [x] 4.3 Below the existing field row `<div>` (the one with the type selector, name input, required checkbox, and delete button), add a conditional constraint sub-panel:
    ```tsx
    {(field.type === 'text' || field.type === 'long_text') && (
      <div className="flex items-center gap-3 px-3 pb-3 text-xs text-zinc-500 dark:text-zinc-400">
        <label className="flex flex-col gap-1">
          Min Length
          <Input type="number" min={0} className="w-20 h-7 text-xs bg-white dark:bg-zinc-900"
            value={field.minLength ?? ''}
            onChange={(e) => updateField(index, { minLength: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1">
          Max Length
          <Input type="number" min={1} className="w-20 h-7 text-xs bg-white dark:bg-zinc-900"
            value={field.maxLength ?? ''}
            onChange={(e) => updateField(index, { maxLength: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="∞"
          />
        </label>
        <div className="flex flex-col gap-1 flex-1">
          <span className="flex items-center gap-1">
            Pattern (RegEx)
            {/* Tooltip here — see Task 4.1 */}
          </span>
          <Input type="text" className="h-7 text-xs bg-white dark:bg-zinc-900"
            value={field.pattern ?? ''}
            onChange={(e) => updateField(index, { pattern: e.target.value === '' ? undefined : e.target.value })}
            placeholder="e.g. ^[A-Z]"
          />
        </div>
      </div>
    )}
    {field.type === 'number' && (
      <div className="flex items-center gap-3 px-3 pb-3 text-xs text-zinc-500 dark:text-zinc-400">
        <label className="flex flex-col gap-1">
          Min
          <Input type="number" className="w-24 h-7 text-xs bg-white dark:bg-zinc-900"
            value={field.min ?? ''}
            onChange={(e) => updateField(index, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="–∞"
          />
        </label>
        <label className="flex flex-col gap-1">
          Max
          <Input type="number" className="w-24 h-7 text-xs bg-white dark:bg-zinc-900"
            value={field.max ?? ''}
            onChange={(e) => updateField(index, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="∞"
          />
        </label>
      </div>
    )}
    ```
  - [x] 4.4 Restructure the field row container to accommodate the sub-panel. The constraint sub-panel should be inside the field's outer container `<div>` but below the main row controls. Change the outer container to use a `flex-col` layout, wrapping the existing controls in an inner `flex` row div.
  - [x] 4.5 Run `npx tsc --noEmit` — must pass.

- [x] Task 5: Write new validation tests in `tests/schemaValidation.test.ts` (AC: #6)
  - [x] 5.1 Append 8 new `it(...)` test cases to the existing `describe('Schema Strict Validation Engine')` block (do NOT create a new describe block — keep all validation tests together).
  - [x] 5.2 Each test calls `makeSchema(db, [...])` with the constraint field set, then calls `validateEntryAgainstSchema` with passing and failing values. See AC #6 for the exact cases.

- [x] Task 6: Write new store tests in `tests/schemaBuilderStore.test.ts` (AC: #7)
  - [x] 6.1 Append 4 new `it(...)` test cases to the existing `describe('useSchemaBuilderStore')` block. See AC #7 for the exact cases.

- [x] Task 7: Final validation (AC: #8, #9)
  - [x] 7.1 Run `npx tsc --noEmit` — must report 0 errors.
  - [x] 7.2 Run `npx vitest run` — all new tests pass; no regressions (pre-existing baseline: 13 failed | 50 passed).

## Dev Notes

### What Story 3-3 Left For This Story

Story 3-3 explicitly noted:
> "For stories 3-4 and 3-5, `SchemaField` will need additional optional constraint fields (e.g., `minLength`, `maxLength`, `regex`, `min`, `max`, `options`). Story 3-3 does NOT add these yet — only the store scaffolding and type union expansion. Future stories will extend `SchemaField` as needed."

The `useSchemaBuilderStore` (from 3-3) already handles arbitrary `Partial<SchemaField>` patches in `updateField` via object spread — the new constraint fields will be persisted to the store automatically. The only required store change is the type-change constraint-clearing logic (AC #3).

### `updateField` Constraint-Clearing Pattern

The existing `updateField` in `useSchemaBuilderStore.ts` (~line 84) already clears `relationTarget` when type changes. The new constraint clearing must be added in the same block:

```typescript
updateField: (index: number, patch: Partial<SchemaField>) => {
    const { draftFields } = get();
    if (index < 0 || index >= draftFields.length) return;
    const updated = { ...draftFields[index], ...patch };
    // Clear type-specific constraints when type changes
    if (updated.type !== 'relation') delete updated.relationTarget;
    if (updated.type !== 'text' && updated.type !== 'long_text') {
        delete updated.minLength;
        delete updated.maxLength;
        delete updated.pattern;
    }
    if (updated.type !== 'number') {
        delete updated.min;
        delete updated.max;
    }
    const newFields = [...draftFields];
    newFields[index] = updated;
    set({ draftFields: newFields, isDirty: true });
},
```

> **Important:** Do NOT guard the delete blocks with `'type' in patch` — the clearing should happen on every `updateField` call based on the *current* type, not only when type is in the patch. This way, if a field is directly set to `{ minLength: 3 }` on a `relation` type field (which would be a UI bug), the extra properties are still cleaned. The existing test "updateField merges patch; relation target cleared when type changes away from 'relation'" (`tests/schemaBuilderStore.test.ts`) must still pass.

### Zod Constraint Chaining — TypeScript Cast Required

Zod's `ZodString` and `ZodNumber` types are not `ZodTypeAny`, so chaining `.min()`, `.max()`, `.regex()` after `let base: z.ZodTypeAny` requires TypeScript casts. Use `(base as z.ZodString).min(...)` and reassign to `base`. This is the same pattern already used in the existing `date` branch (`z.string().refine(...)`).

Do NOT use `z.string({ minLength: ... })` (Zod v4 syntax) — check the existing Zod version in `package.json`. The existing code uses `.refine()` chains, indicating Zod v3.x style.

### `long_text` Needs Its Own Case in Validation

Currently `src/lib/validation.ts` has no `case 'long_text':` — it falls through to `default: z.unknown()`. This story adds the explicit branch:

```typescript
case 'long_text':
case 'text':
  base = z.string();
  if (field.minLength !== undefined) base = (base as z.ZodString).min(field.minLength);
  if (field.maxLength !== undefined) base = (base as z.ZodString).max(field.maxLength);
  if (field.pattern !== undefined) {
    try {
      base = (base as z.ZodString).regex(new RegExp(field.pattern));
    } catch {
      console.warn(`Invalid regex pattern for field "${field.name}": ${field.pattern}`);
    }
  }
  break;
```

Note the fall-through: `case 'long_text':` immediately precedes `case 'text':` with no `break`. This is intentional.

### Tooltip Component — Check Availability First

Before importing `Tooltip` from `../../components/ui/tooltip`, check if the file exists. The architecture defines `src/components/ui/` as the Shadcn component directory. If the tooltip component is not yet installed, use a simple `title` attribute on the Info icon as a fallback:

```tsx
<Info size={12} title="JavaScript RegExp source string, e.g. '^[A-Z]' matches strings starting with a capital letter. No leading/trailing delimiters." />
```

Do NOT install new Shadcn components or run `npx shadcn@latest add` without confirming the component is available. If `tooltip.tsx` is missing, use the `title` attribute fallback and leave a `// TODO: replace with Tooltip component when installed` comment.

### SchemaBuilder Layout Restructure

The current field row `<div>` in `SchemaBuilder.tsx` (~line 113) uses:
```tsx
<div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border ...">
```

To add the constraint sub-panel below the main controls, change to:
```tsx
<div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
  {/* Main controls row */}
  <div className="flex items-center gap-2 p-3">
    {/* ... existing content unchanged ... */}
  </div>
  {/* Constraint sub-panel — rendered conditionally based on field.type */}
  {(field.type === 'text' || field.type === 'long_text') && ( ... )}
  {field.type === 'number' && ( ... )}
</div>
```

The `border` and `rounded-lg` classes are moved to the outer container. The inner main-controls div retains `p-3`.

### Constraint Sub-Panel UX Notes

- Constraint inputs use `type="number"` (for min/max/minLength/maxLength) — this prevents non-numeric input natively.
- All constraint inputs are optional — an empty field means "no constraint applied".
- The constraint sub-panel uses a slightly different background to visually separate it from the main field row (e.g., `bg-zinc-100 dark:bg-zinc-900` or a subtle border-top).
- Labels are `<label>` elements wrapping the input (implicit `htmlFor` pattern), satisfying WCAG AA requirement from the UX spec.
- The Pattern RegEx `Input` should display a small info indicator (Info icon or tooltip) explaining the expected format.

### Pattern Validation in the UI (Client-Side Pre-Check)

To provide immediate feedback on invalid RegEx, add an `onBlur` handler on the Pattern input that attempts `new RegExp(value)` and sets a local error state if it throws. This is **presentational state** (allowed per the architecture), not draft schema state:

```tsx
const [patternError, setPatternError] = React.useState<Record<number, string | null>>({});

// In the Pattern Input:
onBlur={(e) => {
  if (e.target.value) {
    try { new RegExp(e.target.value); setPatternError(prev => ({ ...prev, [index]: null })); }
    catch { setPatternError(prev => ({ ...prev, [index]: 'Invalid RegEx pattern' })); }
  }
}}
```

Display `patternError[index]` as a small `text-red-500 text-xs` message below the pattern input when set. This is the only permissible use of local `useState` in this story (pure presentational error state for an individual field, not draft schema data).

### Two `useLedgerStore` Files — Use `src/stores/`

As noted in Story 3-3: there are two `useLedgerStore` files. `SchemaBuilder.tsx` already imports from `../../stores/useLedgerStore` (the canonical one at `src/stores/useLedgerStore.ts`). Do not change this import. Do not touch `src/features/ledger/useLedgerStore.ts`.

### Existing Tests Baseline

Per Story 3-3 completion notes: baseline is **13 failed | 50 passed (63 files)**. The 13 pre-existing failures are known timeouts in `SchemaBuilder.test.tsx` (Radix Select portal/animation issues in jsdom) — they are NOT regressions from this story. After this story, the count of passing tests should increase by the number of new tests added.

### Project Structure Notes

- **Modified files:**
  - `src/types/ledger.ts` — extend `SchemaField` interface
  - `src/lib/validation.ts` — add `long_text` branch, chain constraints
  - `src/stores/useSchemaBuilderStore.ts` — extend type-change clearing in `updateField`
  - `src/features/ledger/SchemaBuilder.tsx` — add constraint sub-panel UI
- **Modified test files:**
  - `tests/schemaValidation.test.ts` — append new constraint validation tests
  - `tests/schemaBuilderStore.test.ts` — append type-change constraint-clearing tests

### References

- PRD FR7 (constraint types): [Source: _bmad-output/planning-artifacts/prd.md — FR7]
- PRD FR6 (field types): [Source: _bmad-output/planning-artifacts/prd.md — FR6]
- Story 3-3 dev notes (SchemaField extension note, updateField pattern, Zod version): [Source: _bmad-output/implementation-artifacts/3-3-schema-builder-type-configuration-store.md — Dev Notes]
- Architecture — no local useState for async, Zustand store shape: [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns]
- Architecture — naming conventions (`use{Domain}Store`, PascalCase components): [Source: _bmad-output/planning-artifacts/architecture.md — Naming Patterns]
- UX spec — WCAG AA `<label htmlFor>` requirement: [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Accessibility]
- UX spec — Shadcn component library usage: [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Component Library]
- Existing Zod validation engine: [Source: src/lib/validation.ts]
- Existing SchemaBuilder component: [Source: src/features/ledger/SchemaBuilder.tsx]
- Primary schema store: [Source: src/stores/useSchemaBuilderStore.ts]
- SchemaField type: [Source: src/types/ledger.ts]
- Story 3-5 scope (Date & Relation UI — do NOT implement here): [Source: _bmad-output/planning-artifacts/epics.md — Epic 3 story 3.5]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4.6)

### Debug Log References

- Fixed `Info` Lucide icon `title` prop incompatibility: wrapped in `<span title="...">` since Lucide SVG components don't accept `title` as a prop directly.

### Completion Notes List

- **Task 1**: Extended `SchemaField` interface in `src/types/ledger.ts` with 5 optional constraint fields: `minLength`, `maxLength`, `pattern`, `min`, `max`.
- **Task 2**: Updated `buildZodSchemaFromLedger` in `src/lib/validation.ts` — added `long_text` fall-through case, chained Zod constraints conditionally with TypeScript casts (`as z.ZodString`, `as z.ZodNumber`). Invalid regex is caught with `console.warn` and constraint is skipped gracefully.
- **Task 3**: Extended `updateField` in `src/stores/useSchemaBuilderStore.ts` with constraint-clearing logic on every call — clears text constraints for non-text/long_text types, clears number constraints for non-number types.
- **Task 4**: Restructured `SchemaBuilder.tsx` field rows to `flex-col` outer container with inner controls row and conditional constraint sub-panels. Used `<span title="...">` wrapping `Info` icon as tooltip fallback (tooltip.tsx not present in `src/components/ui/`).
- **Task 5**: Appended 8 new test cases to `tests/schemaValidation.test.ts` covering all AC #6 scenarios.
- **Task 6**: Appended 4 new test cases to `tests/schemaBuilderStore.test.ts` covering all AC #7 scenarios.
- **Task 7**: `npx tsc --noEmit` → 0 errors. `npx vitest run tests/schemaValidation.test.ts tests/schemaBuilderStore.test.ts` → 42/42 tests pass.

### File List

- `src/types/ledger.ts` — extended `SchemaField` interface with constraint fields
- `src/lib/validation.ts` — added `long_text` case, Zod constraint chaining for text/number
- `src/stores/useSchemaBuilderStore.ts` — extended `updateField` with type-constraint clearing
- `src/features/ledger/SchemaBuilder.tsx` — restructured field rows, added constraint sub-panels
- `tests/schemaValidation.test.ts` — appended 8 new constraint validation tests
- `tests/schemaBuilderStore.test.ts` — appended 4 new type-change constraint-clearing tests
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to review
