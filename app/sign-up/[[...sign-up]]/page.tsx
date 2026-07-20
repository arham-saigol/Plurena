import { SignUp } from "@clerk/nextjs";
import { Brand } from "@/components/brand";
import { ConfigurationRequired } from "@/components/configuration-required";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return <ConfigurationRequired />;
  return (
    <main className="bg-muted grid min-h-screen grid-rows-[64px_1fr]">
      <header className="flex items-center px-6">
        <Brand />
      </header>
      <div className="grid place-items-center p-6">
        <SignUp />
      </div>
    </main>
  );
}
