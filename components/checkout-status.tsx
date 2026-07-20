"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCredits } from "@/lib/utils";

export function CheckoutStatus() {
  const requestId = useSearchParams().get("session");
  const checkout = useQuery(
    api.payments.checkoutStatus,
    requestId ? { requestId } : "skip",
  );

  if (!requestId) {
    return (
      <StatusContent
        icon={<CircleAlert />}
        title="Checkout reference missing"
        description="Return to billing and start a new checkout."
      />
    );
  }
  if (
    checkout === undefined ||
    checkout.status === "creating" ||
    checkout.status === "pending"
  ) {
    return (
      <StatusContent
        icon={<Loader2 className="animate-spin text-[var(--blue)]" />}
        title="Confirming your payment"
        description="Your checkout finished. We are waiting for the signed payment confirmation; this page updates automatically."
      />
    );
  }
  if (
    checkout.status === "completed" ||
    checkout.status === "partially_refunded"
  ) {
    return (
      <StatusContent
        icon={<CheckCircle2 className="text-emerald-500" />}
        title={
          checkout.status === "partially_refunded"
            ? "Purchase partially refunded"
            : `${formatCredits(checkout.credits)} added`
        }
        description={
          checkout.status === "partially_refunded"
            ? "This purchase was partially refunded, so the corresponding credits were reversed."
            : "Your payment is confirmed and the credits are ready to use."
        }
      />
    );
  }
  if (checkout.status === "refunded" || checkout.status === "disputed") {
    return (
      <StatusContent
        icon={<CircleAlert className="text-[var(--amber)]" />}
        title={
          checkout.status === "refunded"
            ? "Payment refunded"
            : "Payment disputed"
        }
        description={
          checkout.errorMessage ??
          "The credits from this purchase have been reversed."
        }
      />
    );
  }
  return (
    <StatusContent
      icon={<CircleAlert className="text-destructive" />}
      title="Payment was not credited"
      description={
        checkout.errorMessage ??
        "The checkout could not be confirmed. No credits were added."
      }
    />
  );
}

function StatusContent({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto grid min-h-[65vh] max-w-lg place-items-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center px-8 py-12 text-center">
          <div className="mb-5 [&_svg]:size-10">{icon}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            {description}
          </p>
          <div className="mt-7 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/app/billing">View billing</Link>
            </Button>
            <Button asChild variant="blue">
              <Link href="/app/tests/new">Create a test</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
