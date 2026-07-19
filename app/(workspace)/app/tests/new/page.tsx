import { Suspense } from "react";
import { TestWizard } from "@/components/test-wizard";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewTestPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <TestWizard />
    </Suspense>
  );
}
