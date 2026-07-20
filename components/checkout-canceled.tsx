"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { CircleX } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CheckoutCanceled() {
  const requestId = useSearchParams().get("session");
  const cancelCheckout = useMutation(api.payments.cancelCheckout);
  const canceled = useRef(false);

  useEffect(() => {
    if (!requestId || canceled.current) return;
    canceled.current = true;
    void cancelCheckout({ requestId });
  }, [cancelCheckout, requestId]);

  return (
    <div className="mx-auto grid min-h-[65vh] max-w-lg place-items-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center px-8 py-12 text-center">
          <CircleX className="text-muted-foreground mb-5 size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Checkout canceled
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            No funds were added and your existing balance was not changed. You
            can start another checkout whenever you are ready.
          </p>
          <div className="mt-7 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/app">Back to workspace</Link>
            </Button>
            <Button asChild variant="blue">
              <Link href="/app/billing">Try again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
