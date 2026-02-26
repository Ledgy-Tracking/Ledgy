# Story 6.4: AI Capture Plugin: Draft Review (Show Before Save)

Status: ready-for-dev

## Story

As a user,
I want to review and correct the AI's extraction before it touches my ledger,
So that I retain absolute trust in my data integrity.

## Acceptance Criteria

1. **Draft Entry Card:** After extraction, modal shows "Draft Entry Card" with extracted fields populated. [Source: epics.md#Story 6.4]
2. **Field Editing:** User can manually edit any field on the Draft Card before committing. [Source: epics.md#Story 6.4]
3. **Draft-First Rule:** Data NOT written to PouchDB until user explicitly clicks "Commit". [Source: epics.md#Story 6.4]
4. **Commit Action:** Clicking "Commit" writes entry via core `create_entry` API and closes modal. [Source: epics.md#Story 6.4]
5. **Dismiss Action:** Clicking "Dismiss" or closing modal discards draft without saving. [Source: epics.md#Story 6.4]
6. **Validation:** Required fields highlighted if empty; commit blocked until valid. [Source: UX Design Spec]

## Tasks / Subtasks

- [ ] Task 1: Draft Entry Card Component (AC: 1, 2)
  - [ ] Create `DraftEntryCard` component in `src/plugins/ai-capture/`.
  - [ ] Render form fields based on active ledger schema.
  - [ ] Pre-populate fields with extracted data.
  - [ ] Make all fields editable (text inputs, number inputs, date pickers).
  - [ ] Handle relation fields with combobox if applicable.
- [ ] Task 2: Commit Logic (AC: 3, 4)
  - [ ] Wire "Commit" button to `create_entry` via plugin API.
  - [ ] Validate form data before commit.
  - [ ] Show success toast on commit.
  - [ ] Close modal and clear draft state.
- [ ] Task 3: Dismiss Logic (AC: 5)
  - [ ] Wire "Dismiss" button to discard draft.
  - [ ] Clear all state on dismiss.
  - [ ] Close modal.
- [ ] Task 4: Field Validation (AC: 6)
  - [ ] Highlight required fields (all fields by default).
  - [ ] Block commit if required fields empty.
  - [ ] Show inline validation errors.
- [ ] Task 5: Testing & Integration
  - [ ] Unit tests for `DraftEntryCard` rendering.
  - [ ] Unit tests for field editing.
  - [ ] Integration test: Extract → edit fields → commit → entry created.
  - [ ] Test dismiss: Extract → dismiss → no entry created.

## Dev Notes

### Technical Requirements

**CRITICAL: Use existing git branch for Epic 6**
- You MUST be on branch `epic/epic-6` for all commits

**Draft Entry Card State:**
```typescript
interface DraftEntryState {
  ledgerId: string;
  fields: Record<string, string | number | Date>;
  errors: Record<string, string>;
  isValid: boolean;
}
```

**Commit Function:**
```typescript
async function commitDraft(draft: DraftEntryState): Promise<void> {
  if (!validateDraft(draft)) {
    throw new Error('Invalid draft data');
  }

  await create_entry({
    _id: `entry:${uuid()}`,
    type: 'entry',
    schemaVersion: 1,
    ledgerId: draft.ledgerId,
    fields: draft.fields,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
```

**Validation Logic:**
```typescript
function validateDraft(draft: DraftEntryState): boolean {
  const errors: Record<string, string> = {};

  for (const [field, value] of Object.entries(draft.fields)) {
    if (!value || value === '') {
      errors[field] = 'Required';
    }
  }

  draft.errors = errors;
  draft.isValid = Object.keys(errors).length === 0;
  return draft.isValid;
}
```

**Architecture Compliance:**
- Plugin uses core `create_entry` API
- Draft state in plugin store only (not persisted)
- Errors → `useErrorStore` → `<ErrorToast />`

**Code Patterns:**
- Use shadcn/ui `Form`, `Input`, `Button`, `Label` components
- Follow form validation patterns from Story 3.1, 3.2
- Co-locate tests

### File Structure

```
src/plugins/ai-capture/
├── DraftEntryCard.tsx            # NEW: Draft review form
├── DraftEntryCard.test.tsx       # NEW: Tests
├── AICaptureModal.tsx            # MODIFIED: Add review state
└── useAICaptureStore.ts          # MODIFIED: Add draft state
```

### Testing Requirements

**Unit Tests:**
- `DraftEntryCard` renders all field types correctly
- Field editing updates draft state
- Validation blocks commit with empty required fields
- Dismiss clears draft state

**Integration Tests:**
- Extract → edit fields → commit → entry created in PouchDB
- Extract → dismiss → no entry created
- Validation errors shown for empty fields

### Previous Story Intelligence

**From Story 6.1:**
- Plugin runtime structure

**From Story 6.2:**
- `AICaptureModal` component
- Image ingestion

**From Story 6.3:**
- Google AI extraction
- Structured data response

**From Story 3.1, 3.2:**
- Schema/entry types
- Form validation patterns
- `create_entry` function

### References

- [Source: planning-artifacts/epics.md#Story 6.4]
- [Source: planning-artifacts/architecture.md#AI Capture Plugin]
- [Source: planning-artifacts/ux-design-specification.md#Draft-First Rule]
- [Source: docs/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Implementation Plan

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

<!-- To be filled by dev agent -->

### File List

<!-- To be filled by dev agent -->

### Change Log

<!-- To be filled by dev agent -->
