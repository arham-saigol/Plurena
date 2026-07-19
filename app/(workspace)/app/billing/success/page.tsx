import { Suspense } from "react";
import { CheckoutStatus } from "@/components/checkout-status";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-32 h-72 max-w-lg" />}>
      <CheckoutStatus />
    </Suspense>
  );
}
