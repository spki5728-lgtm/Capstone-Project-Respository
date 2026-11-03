// Errors whose message is safe to show the seller. Anything else is logged and replaced with a generic message,
// so raw details from Claude, Blobs or Netlify never reach the browser.
export class UserFacingError extends Error {}

export function publicMessage(error: unknown, fallback: string): string {
  if (error instanceof UserFacingError) return error.message;
  console.error(error);
  return fallback;
}
