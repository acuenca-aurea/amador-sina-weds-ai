"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthForm from "@/components/AuthForm";
import logger from "@/lib/logger";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const handleLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn("Login failed", { email: email.split("@")[0] + "@..." });
      setError(error.message);
      return;
    }

    logger.info("User logged in successfully");
    router.push(redirectTo);
    router.refresh();
  };

  return <AuthForm mode="login" onSubmit={handleLogin} error={error} />;
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <span className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
