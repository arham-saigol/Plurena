import type { Id } from "@/convex/_generated/dataModel";
import { TestDetail } from "@/components/test-detail";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TestDetail testId={id as Id<"tests">} />;
}
