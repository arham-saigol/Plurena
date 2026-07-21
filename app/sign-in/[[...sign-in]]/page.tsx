import { AuthShell } from "@/components/auth-shell";
import { ConfigurationRequired } from "@/components/configuration-required";
import { GoogleAuthCard } from "@/components/google-auth-card";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return <ConfigurationRequired />;
  return (
    <AuthShell>
      <GoogleAuthCard mode="sign-in" />
    </AuthShell>
  );
}
