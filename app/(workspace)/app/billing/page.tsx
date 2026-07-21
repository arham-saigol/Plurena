import { BillingPanel } from "@/components/billing-panel";
import { PageHeader } from "@/components/page-header";

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Credits & billing"
        description="Purchase credits and review every credit movement."
      />
      <BillingPanel />
    </div>
  );
}
