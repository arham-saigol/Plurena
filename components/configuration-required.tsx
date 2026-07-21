import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export function ConfigurationRequired() {
  return (
    <main className="bg-background grid min-h-screen place-items-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl border p-7 shadow-[var(--shadow-sm)] sm:p-8">
        <Brand />
        <div className="bg-accent mt-8 grid size-10 place-items-center rounded-lg">
          <Settings2 className="size-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Connect your services to continue
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          The interface is ready, but authentication and data need your project
          credentials. Add the Convex client URL and Clerk keys, then set the
          Clerk JWT issuer on the connected Convex Cloud deployment.
        </p>
        <div className="bg-muted text-muted-foreground mt-5 rounded-lg border p-4 font-mono text-xs leading-6">
          NEXT_PUBLIC_CONVEX_URL
          <br />
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
          <br />
          CLERK_SECRET_KEY
          <br />
          CLERK_JWT_ISSUER_DOMAIN
        </div>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </main>
  );
}
