import { AuthShell } from "@/components/auth-shell";
import { ConfigurationRequired } from "@/components/configuration-required";
import { GoogleAuthCard } from "@/components/google-auth-card";

export default function SignUpPage() {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL
  )
    return <ConfigurationRequired />;
  return (
    <AuthShell>
      <GoogleAuthCard mode="sign-up" />
    </AuthShell>
  );
}
