import type { Metadata } from "next";
import { TestDetails } from "@/components/test-details";

export const metadata: Metadata = { title: "Test results" };
export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestDetails testId={id} />;
}
