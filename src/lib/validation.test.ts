import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEntryAgainstSchema, ValidationError } from './validation';
import type { LedgerSchema } from '../types/ledger';

describe('validateEntryAgainstSchema', () => {
  const schema: LedgerSchema = {
        name: 'Test Schema',
    fields: [
      { id: '1', name: 'textField', type: 'text', required: true },
      { id: '2', name: 'regexField', type: 'text', required: false, pattern: '^[A-Z]+$' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates a correct entry', () => {
    const data = { textField: 'hello', regexField: 'HELLO' };
    const result = validateEntryAgainstSchema(data, schema);
    expect(result).toEqual(data);
  });

  it('throws on missing required field', () => {
    const data = { regexField: 'HELLO' };
    expect(() => validateEntryAgainstSchema(data, schema)).toThrow(ValidationError);
  });

  it('throws on regex mismatch', () => {
    const data = { textField: 'hello', regexField: 'hello' };
    expect(() => validateEntryAgainstSchema(data, schema)).toThrow(ValidationError);
  });

  it('rejects unsafe regex pattern', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const unsafeSchema: LedgerSchema = {
            name: 'Test Schema',
      fields: [
        { id: '1', name: 'regexField', type: 'text', required: false, pattern: '(a+)+' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const data = { regexField: 'aaaaa' };
    // the unsafe regex is ignored/rejected, so it doesn't apply to zod
    // so any string passes the ignored regex
    const result = validateEntryAgainstSchema(data, unsafeSchema);
    expect(result).toEqual(data);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unsafe regex pattern rejected for field "regexField": (a+)+')
    );
  });
});
