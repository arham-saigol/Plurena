"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="text-destructive text-sm font-medium">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          This page could not be loaded.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Your data is safe. Try the request again, or return to the dashboard.
        </p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
