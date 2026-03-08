import { z } from "zod";
import type { LedgerSchema } from "../types/ledger";

export class ValidationError extends Error {
  constructor(zodError: z.ZodError) {
    const fieldErrors = zodError.issues
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    super(`Validation failed:\n${fieldErrors}`);
    this.name = "ValidationError";
  }
}

export function buildZodSchemaFromLedger(
  schema: LedgerSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of schema.fields) {
    let base: z.ZodTypeAny;
    switch (field.type) {
      case "long_text":
      case "text":
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
      case "number":
        base = z.number();
        if (field.min !== undefined) base = (base as z.ZodNumber).min(field.min);
        if (field.max !== undefined) base = (base as z.ZodNumber).max(field.max);
        break;
      case "date":
        base = z.string().refine(
          (v) => !isNaN(Date.parse(v)),
          { message: "Must be a valid date string (ISO 8601 recommended)" }
        );
        break;
      case "relation":
        base = z.string();
        break;
      default:
        base = z.unknown();
    }
    shape[field.name] = field.required ? base : base.optional();
  }

  return z.object(shape);
}

export function validateEntryAgainstSchema(
  data: Record<string, unknown>,
  schema: LedgerSchema
): Record<string, unknown> {
  const zodSchema = buildZodSchemaFromLedger(schema);
  const result = zodSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data as Record<string, unknown>;
}
