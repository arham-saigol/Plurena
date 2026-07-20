"use client";

import { UserProfile } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Bot, Cloud, CreditCard, LockKeyhole } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPanel() {
  const configuration = useQuery(api.tests.configuration);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={Cloud}
          title="Data layer"
          value="Convex Cloud"
          detail="Realtime, durable execution"
        />
        <StatusCard
          icon={LockKeyhole}
          title="Authentication"
          value="Clerk"
          detail="Protected workspace routes"
        />
        <StatusCard
          icon={CreditCard}
          title="Payments"
          value="Creem"
          detail="Webhook-verified credits"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4" /> Available respondent models
          </CardTitle>
          <CardDescription>
            Model availability and vision support come from the server-owned
            routing catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configuration === undefined ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {configuration.models.map((model) => (
                <Badge
                  key={model.key}
                  className="h-7 gap-1.5 border bg-transparent"
                >
                  {model.label}
                  {model.vision && (
                    <span className="text-[var(--blue)]">Vision</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
