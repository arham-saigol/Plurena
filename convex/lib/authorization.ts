export function assertOwner(ownerId: string, currentUserId: string) {
  if (ownerId !== currentUserId) throw new Error("NOT_FOUND");
  return true;
}

export function assertAuthenticated<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("UNAUTHENTICATED");
  return value;
}
