import { CirclesFour } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function SetupRequired() {
  return <main className="center-page"><Card className="setup-card"><CardHeader><CirclesFour size={26} weight="fill" /><h1>Connect Convex to continue</h1><CardDescription>Complete the local environment setup to open Plurena.</CardDescription></CardHeader><CardContent>Copy <code>.env.example</code> to <code>.env.local</code>, add your Clerk and Convex values, then run <code>npx convex dev</code>.</CardContent></Card></main>;
}
