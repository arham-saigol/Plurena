import { ConvexError } from "convex/values";

export function assertOwner(ownerId: string, currentUserId: string) {
  if (ownerId !== currentUserId) throw new ConvexError("NOT_FOUND");
  return true;
}

export function assertAuthenticated<T>(value: T | null | undefined): T {
  if (value == null) throw new ConvexError("UNAUTHENTICATED");
  return value;
}
