"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthForm from "@/components/AuthForm";
import logger from "@/lib/logger";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignup = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.warn("Signup failed", { email: email.split("@")[0] + "@..." });
      setError(error.message);
      return;
    }

    logger.info("User signed up successfully");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <AuthForm mode="signup" onSubmit={handleSignup} error={error} />
    </main>
  );
}
