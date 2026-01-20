"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";

interface SubtaskItem {
  text: string;
  checked: boolean;
}

export default function Home() {
  const supabase = createClient();

  const [task, setTask] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, [supabase.auth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!task.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSubtasks([]);

    try {
      const response = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSubtasks(
        data.subtasks.map((text: string) => ({ text, checked: false }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't break down your task. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtask = (index: number) => {
    setSubtasks((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit({ preventDefault: () => {} } as FormEvent);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-amber-400 tracking-tight mb-2">
              TaskBreaker
            </h1>
            <p className="text-slate-400 text-lg">
              Enter a task. AI breaks it down.
            </p>
            {isAuthenticated === false && (
              <p className="text-slate-500 text-sm mt-2">
                <Link
                  href="/signup"
                  className="text-amber-400 hover:text-amber-300"
                >
                  Sign up
                </Link>{" "}
                to save your tasks and track progress
              </p>
            )}
            {isAuthenticated === true && (
              <p className="text-slate-500 text-sm mt-2">
                <Link
                  href="/dashboard"
                  className="text-amber-400 hover:text-amber-300"
                >
                  Go to Dashboard
                </Link>{" "}
                to view your saved tasks
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Enter a task..."
                maxLength={200}
                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-lg"
                disabled={loading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {task.length}/200
              </span>
            </div>
            <button
              type="submit"
              disabled={!task.trim() || loading}
              className="w-full mt-4 px-6 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Breaking down...
                </>
              ) : (
                "Break it down"
              )}
            </button>
          </form>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-5 mb-6 animate-fade-in">
              <p className="text-red-300 mb-3">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-red-100 rounded-lg text-sm font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {subtasks.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-300 font-medium text-sm uppercase tracking-wider">
                  Subtasks
                </h2>
                {isAuthenticated === false && (
                  <Link
                    href="/signup"
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    Sign up to save
                  </Link>
                )}
              </div>
              <ul className="space-y-3">
                {subtasks.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => toggleSubtask(index)}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors group"
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        item.checked
                          ? "bg-amber-500 border-amber-500"
                          : "border-slate-600 group-hover:border-slate-500"
                      }`}
                    >
                      {item.checked && (
                        <svg
                          className="w-3 h-3 text-slate-900"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-lg transition-all duration-200 ${
                        item.checked
                          ? "text-slate-500 line-through"
                          : "text-slate-200"
                      }`}
                    >
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
