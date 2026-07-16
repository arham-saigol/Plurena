import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  await auth.protect();
  return <Dashboard />;
}
