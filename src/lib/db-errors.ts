// Which database constraint a failed query violated, if any. Drizzle wraps
// the driver error, so this walks the `cause` chain.
export function violatedConstraint(error: unknown): string | undefined {
  let current: unknown = error;
  while (current instanceof Error) {
    const match = /constraint "([^"]+)"/.exec(current.message);
    if (match) return match[1];
    current = current.cause;
  }
  return undefined;
}
