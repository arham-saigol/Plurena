import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background grid min-h-screen place-items-center p-6 text-center">
      <div>
        <Brand className="justify-center" />
        <p className="eyebrow mt-10">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The page you are looking for does not exist or has moved.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </main>
  );
}
