import { CirclesFour } from "@phosphor-icons/react/dist/ssr";

export function SetupRequired() {
  return <main className="center-page"><div className="setup-card"><CirclesFour size={26} weight="fill" /><h1>Connect Convex to continue</h1><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Clerk and Convex values, then run <code>npx convex dev</code>.</p></div></main>;
}
