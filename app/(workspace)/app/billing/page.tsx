import { BillingPanel } from "@/components/billing-panel";
import { PageHeader } from "@/components/page-header";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Balance & billing"
        description="Add prepaid funds and review every balance movement."
      />
      <BillingPanel />
    </>
  );
}
