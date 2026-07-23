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
          credentials. Configure the application data and authentication
          services before opening the workspace.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </main>
  );
}
