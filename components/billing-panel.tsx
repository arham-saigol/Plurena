"use client";

import { useAction, useQuery } from "convex/react";
import {
  ArrowUpRight,
  CreditCard,
  Gift,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";

const presets = [1, 5, 10, 20];

export function BillingPanel() {
  const user = useQuery(api.users.current);
  const ledger = useQuery(api.users.ledger, { limit: 50 });
  const createCheckout = useAction(api.paymentActions.createCheckout);
  const [quantity, setQuantity] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = async () => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      toast.error("Choose between 1 and 100 top-up units.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createCheckout({
        quantity,
        requestId: crypto.randomUUID().replaceAll("-", ""),
      });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.45fr]">
        <Card className="overflow-hidden border-blue-500/20 bg-[linear-gradient(145deg,rgba(35,131,226,0.11),transparent_60%)]">
          <CardHeader>
            <CardDescription>Available balance</CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {user ? (
                formatMoney(user.balanceCents)
              ) : (
                <Skeleton className="h-10 w-32" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground max-w-sm text-sm leading-6">
              Plurena uses prepaid dollars. A test is charged once when it
              launches, and unused respondent work is automatically refunded.
            </p>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <ShieldCheck className="size-4 text-emerald-500" /> Payments are
              processed securely by Creem.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add funds</CardTitle>
            <CardDescription>
              Each unit adds $5.00 to your Plurena balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={quantity === preset ? "secondary" : "outline"}
                  onClick={() => setQuantity(preset)}
                >
                  {formatMoney(preset * 500)}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-2 text-sm font-medium">
                Units
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>
              <Button
                variant="blue"
                size="lg"
                disabled={submitting}
                onClick={startCheckout}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CreditCard />
                )}
                Continue to pay {formatMoney(quantity * 500)}
                {!submitting && <ArrowUpRight />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Credits do not expire. Your balance is updated only after a
              verified payment webhook.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4" /> Transaction history
          </CardTitle>
          <CardDescription>
            Every credit, charge, and refund in one auditable ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {ledger === undefined ? (
            <div className="space-y-3 px-5">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-12 w-full" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-muted-foreground px-5 py-10 text-center text-sm">
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y">
              {ledger.map((entry) => {
                const positive = entry.amountCents >= 0;
                return (
                  <div
                    key={entry._id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="bg-muted grid size-9 shrink-0 place-items-center rounded-md">
                      {entry.type === "onboarding_bonus" ? (
                        <Gift className="size-4" />
                      ) : (
                        <ReceiptText className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entry.reason}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }).format(entry.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                      >
                        {positive ? "+" : ""}
                        {formatMoney(entry.amountCents)}
                      </p>
                      <Badge className="border bg-transparent">
                        Balance {formatMoney(entry.resultingBalanceCents)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
