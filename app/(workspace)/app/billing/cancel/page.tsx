import { Suspense } from "react";
import { CheckoutCanceled } from "@/components/checkout-canceled";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingCancelPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-32 h-72 max-w-lg" />}>
      <CheckoutCanceled />
    </Suspense>
  );
}
