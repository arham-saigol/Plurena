"use client";

import { UserProfile } from "@clerk/nextjs";
import { Cloud, CreditCard, LockKeyhole } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={Cloud}
          title="Data layer"
          value="Active"
          detail="Realtime, durable execution"
        />
        <StatusCard
          icon={LockKeyhole}
          title="Authentication"
          value="Protected"
          detail="Protected workspace routes"
        />
        <StatusCard
          icon={CreditCard}
          title="Payments"
          value="Secure"
          detail="Webhook-verified credits"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Profile and security</CardTitle>
          <CardDescription>
            Manage your name, email addresses, connected accounts, sessions, and
            account deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UserProfile
            routing="hash"
            appearance={{
              ...clerkAppearance,
              elements: {
                cardBox: "w-full shadow-none",
                navbar: "border-r",
                rootBox: "w-full",
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <div className="bg-muted grid size-9 place-items-center rounded-md">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{title}</p>
          <p className="text-sm font-semibold">{value}</p>
          <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
