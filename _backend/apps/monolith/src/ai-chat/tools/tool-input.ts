import { z } from 'zod';

// What the model sends, cleaned before a tool sees it. A small model fills in every optional
// field it is offered, and an empty filter matches nothing rather than asking a question.

// An optional text argument: trimmed, and gone when nothing is left of it. The JSON schema the
// model reads is unchanged - the SDK builds it from the input side, so only the parsed value differs.
export function optionalText(): z.ZodType<string | undefined, string | undefined> {
  return z
    .string()
    .optional()
    .transform((text) => {
      const trimmed = text?.trim();

      return trimmed === undefined || trimmed === '' ? undefined : trimmed;
    });
}

// An optional id argument: gone when it is not a real id. A filling model reaches for 0, and no
// row ever carries it - every id is an autoincrement starting at 1.
export function optionalId(): z.ZodType<number | undefined, number | undefined> {
  return z
    .number()
    .int()
    .optional()
    .transform((id) => (id === undefined || id <= 0 ? undefined : id));
}
