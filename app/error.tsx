"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="bg-background grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--destructive-soft)]">
          <AlertTriangle className="size-5 text-[var(--destructive)]" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          This page could not be loaded.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Your data is safe. Try the request again, or return to the workspace.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/app">Go to workspace</Link>
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
