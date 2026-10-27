import { z } from "zod";

// { field: firstMessage }, the 400 shape web/src/services/http.ts reads
export function fieldErrors(error: z.ZodError) {
  const fieldMessages = z.flattenError(error).fieldErrors;
  const firstMessages: Record<string, string> = {};

  for (const [field, messages] of Object.entries(fieldMessages)) {
    firstMessages[field] = (messages as string[])[0];
  }
  return firstMessages;
}
