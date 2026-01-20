"use client";

import { useState } from "react";
import Link from "next/link";

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  error?: string | null;
}

export default function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || validationError;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-amber-400 tracking-tight mb-2">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-slate-400">
          {mode === "login"
            ? "Sign in to access your tasks"
            : "Sign up to start breaking down tasks"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 animate-fade-in">
            <p className="text-red-300 text-sm">{displayError}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              disabled={loading}
              required
              minLength={6}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </>
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-slate-400">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
