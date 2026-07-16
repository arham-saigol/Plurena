import { clerkMiddleware } from "@clerk/nextjs/server";

// Authentication is enforced by each protected page and route handler.
// Clerk middleware still needs to run so `auth()` can read the session.
export default clerkMiddleware({
  signInUrl: "/sign-in",
  signUpUrl: "/sign-in",
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
