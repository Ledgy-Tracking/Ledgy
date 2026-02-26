# Story 6.3: AI Capture Plugin: Google AI Studio Integration

Status: ready-for-dev

## Story

As a user,
I want Google AI to automatically extract data from my image and map it to my schema,
So that I don't have to manually type out receipts or health metrics.

## Acceptance Criteria

1. **Extract Button:** Modal shows "Extract" button after image ingestion. [Source: epics.md#Story 6.3]
2. **Prompt Construction:** Plugin packages image + active ledger schema into structured prompt for Google AI Studio API. [Source: epics.md#Story 6.3]
3. **Secure API Connection:** Plugin connects to Google AI Studio API using user-provided API key stored in active profile. [Source: epics.md#Story 6.3]
4. **Structured JSON Response:** API returns structured JSON payload mapped precisely to active schema's fields. [Source: epics.md#Story 6.3]
5. **Error Handling:** API errors (rate limit, invalid key, network) display gracefully in modal with retry option. [Source: epics.md#Story 6.3]
6. **Loading State:** Extraction shows loading indicator with progress feedback. [Source: UX Design Spec]

## Tasks / Subtasks

- [ ] Task 1: Google AI Studio API Integration (AC: 2, 3, 4)
  - [ ] Create `extractFromImage` function in `src/plugins/ai-capture/googleAI.ts`.
  - [ ] Construct prompt with image + schema context.
  - [ ] Call Google AI Studio API (Gemini Pro Vision or equivalent).
  - [ ] Parse structured JSON response matching schema fields.
  - [ ] Handle API authentication with user's API key.
- [ ] Task 2: API Key Management (AC: 3)
  - [ ] Store API key in profile settings (encrypted via `useAuthStore`).
  - [ ] Add settings UI for API key configuration.
  - [ ] Validate API key format before saving.
- [ ] Task 3: Error Handling (AC: 5)
  - [ ] Handle rate limit errors (429) with retry-after suggestion.
  - [ ] Handle invalid API key (401) with settings redirect.
  - [ ] Handle network errors with retry button.
  - [ ] Display clear error messages in modal.
- [ ] Task 4: Loading State (AC: 6)
  - [ ] Show spinner/progress indicator during extraction.
  - [ ] Disable modal buttons while extracting.
  - [ ] Update status text: "Analyzing image...".
- [ ] Task 5: Testing & Integration
  - [ ] Unit tests for prompt construction.
  - [ ] Unit tests for response parsing.
  - [ ] Integration test: Upload image → extract → structured data returned.
  - [ ] Test error scenarios: invalid key, rate limit, network failure.

## Dev Notes

### Technical Requirements

**CRITICAL: Use existing git branch for Epic 6**
- You MUST be on branch `epic/epic-6` for all commits

**Google AI Studio API Call:**
```typescript
async function extractFromImage(
  image: File,
  schema: LedgerSchema,
  apiKey: string
): Promise<ExtractedData> {
  const prompt = buildPrompt(schema);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mimetype: image.type, data: await fileToBase64(image) } }
          ]
        }]
      })
    }
  );

  const result = await response.json();
  return parseResponse(result, schema);
}
```

**Prompt Template:**
```
Extract the following fields from this image. Return JSON only.

Schema:
${schema.fields.map(f => `- ${f.name} (${f.type})`).join('\n')}

Example format:
{ ${schema.fields.map(f => `"${f.name}": "value"`).join(', ')} }
```

**API Key Storage:**
```typescript
// Store encrypted in profile settings
const encryptedKey = await encrypt(apiKey, encryptionKey);
await updateProfile(profileId, { aiApiKey: encryptedKey });
```

**Architecture Compliance:**
- Plugin isolated - uses core `create_entry` for data writes
- API key encrypted via core crypto utilities
- Errors → `useErrorStore` → `<ErrorToast />`

**Code Patterns:**
- Use shadcn/ui `Input`, `Button`, `Alert` components
- Tailwind for styling
- Co-locate tests

### File Structure

```
src/plugins/ai-capture/
├── googleAI.ts                   # NEW: Google AI API integration
├── googleAI.test.ts              # NEW: Tests
├── AICaptureModal.tsx            # MODIFIED: Add extract button
├── APIKeySettings.tsx            # NEW: API key configuration UI
└── useAICaptureStore.ts          # NEW: Plugin state
```

### Testing Requirements

**Unit Tests:**
- Prompt construction includes all schema fields
- Response parsing extracts correct field values
- Error handling for each error type (401, 429, network)
- API key encryption/decryption works

**Integration Tests:**
- Upload image → extract → structured data returned
- Invalid API key → error shown → settings redirect
- Rate limit → retry suggestion shown

### Previous Story Intelligence

**From Story 6.1:**
- Plugin runtime structure
- Plugin isolation patterns

**From Story 6.2:**
- `AICaptureModal` component
- Image ingestion patterns

### References

- [Source: planning-artifacts/epics.md#Story 6.3]
- [Source: planning-artifacts/architecture.md#AI Capture Plugin]
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
