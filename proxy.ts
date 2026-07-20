import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const protectedWorkspace = clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    await auth.protect();
  }
});

export default clerkConfigured ? protectedWorkspace : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
