"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

type AppEntryLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  signedOutHref: "/sign-in" | "/sign-up";
};

export function AppEntryLink({ signedOutHref, ...props }: AppEntryLinkProps) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL
  ) {
    return <Link href={signedOutHref} {...props} />;
  }
  return <ConfiguredAppEntryLink signedOutHref={signedOutHref} {...props} />;
}

function ConfiguredAppEntryLink({
  signedOutHref,
  ...props
}: AppEntryLinkProps) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <Link href={isLoaded && isSignedIn ? "/app" : signedOutHref} {...props} />
  );
}
