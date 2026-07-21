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
import type { CreditOptionKey } from "@/convex/lib/credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCredits, formatMoney } from "@/lib/utils";

export function BillingPanel() {
  const user = useQuery(api.users.current);
  const options = useQuery(api.payments.purchaseOptions);
  const ledger = useQuery(api.users.ledger, { limit: 50 });
  const createCheckout = useAction(api.paymentActions.createCheckout);
  const [selectedOptionKey, setSelectedOptionKey] = useState<CreditOptionKey>();
  const [submitting, setSubmitting] = useState(false);
  const selectedOption =
    options?.find((option) => option.key === selectedOptionKey) ?? options?.[0];

  const startCheckout = async () => {
    if (!selectedOption) return;
    setSubmitting(true);
    try {
      const result = await createCheckout({
        optionKey: selectedOption.key,
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
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.65fr]">
        <Card className="overflow-hidden border-[var(--orange)]/18 bg-[linear-gradient(145deg,var(--orange-soft),transparent_68%)]">
          <CardHeader>
            <CardDescription>Available credits</CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {user ? (
                formatCredits(user.creditBalance)
              ) : (
                <Skeleton className="h-10 w-32" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground max-w-sm text-sm leading-6">
              One credit runs one respondent. Tests are charged once at launch,
              and failed respondent work is automatically refunded.
            </p>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <ShieldCheck className="size-4 text-emerald-500" /> Payments are
              processed securely by Creem.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase credits</CardTitle>
            <CardDescription>
              Larger purchases include progressively more bonus credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {options === undefined ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className="h-28 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {options.map((option, index) => {
                  const selected = selectedOption?.key === option.key;
                  const highestBonus = index === options.length - 1;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedOptionKey(option.key)}
                      className={cn(
                        "hover:border-foreground/30 relative rounded-lg border p-4 text-left transition",
                        highestBonus &&
                          "border-[var(--orange)]/25 bg-[var(--orange-soft)]/55",
                        selected &&
                          "border-[var(--blue)] ring-2 ring-[var(--blue)]/15",
                      )}
                    >
                      <p className="text-xl font-semibold tabular-nums">
                        {formatMoney(option.priceCents)}
                      </p>
                      <p className="mt-2 text-sm font-medium tabular-nums">
                        {formatCredits(option.credits)}
                      </p>
                      <Badge
                        tone={highestBonus ? "blue" : "neutral"}
                        className="mt-3"
                      >
                        {option.bonusPercent > 0 ? "+" : ""}
                        {option.bonusPercent}% bonus
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                Credits do not expire and are added only after a verified
                payment webhook.
              </p>
              <Button
                variant="blue"
                size="lg"
                disabled={submitting || !selectedOption}
                onClick={() => void startCheckout()}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CreditCard />
                )}
                Continue to Creem
                {!submitting && <ArrowUpRight />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4" /> Credit history
          </CardTitle>
          <CardDescription>
            Every purchase, charge, reversal, and refund in one auditable
            ledger.
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
              No credit activity yet.
            </div>
          ) : (
            <div className="divide-y">
              {ledger.map((entry) => {
                const positive = entry.amountCredits >= 0;
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
                        {formatCredits(entry.amountCredits)}
                      </p>
                      <Badge className="border bg-transparent">
                        Balance {formatCredits(entry.resultingCreditBalance)}
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
