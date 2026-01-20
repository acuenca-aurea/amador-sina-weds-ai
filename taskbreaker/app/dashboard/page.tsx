"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import TaskCard from "@/components/TaskCard";
import logger from "@/lib/logger";

interface Subtask {
  id: string;
  text: string;
  checked: boolean;
  position: number;
}

interface Task {
  id: string;
  title: string;
  created_at: string;
  subtasks: Subtask[];
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Check auth and fetch tasks
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await fetchTasks();
    };

    init();
  }, [supabase.auth, router]);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tasks");
      }

      setTasks(data.tasks || []);
    } catch (err) {
      logger.error("Failed to fetch tasks", err as Error);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || creating) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: newTask.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setTasks((prev) => [data.task, ...prev]);
      setNewTask("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleSubtaskToggle = async (
    taskId: string,
    subtaskId: string,
    checked: boolean
  ) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update subtask");
      }

      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks.map((st) =>
                  st.id === subtaskId ? { ...st, checked } : st
                ),
              }
            : task
        )
      );
    } catch (err) {
      logger.error("Failed to toggle subtask", err as Error);
      setError("Failed to update subtask");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      logger.error("Failed to delete task", err as Error);
      setError("Failed to delete task");
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-amber-400 tracking-tight mb-2">
              Your Tasks
            </h1>
            <p className="text-slate-400">
              Break down tasks and track your progress
            </p>
          </div>

          {/* Create new task form */}
          <form onSubmit={handleCreateTask} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Enter a task to break down..."
                maxLength={200}
                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-lg pr-20"
                disabled={creating}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {newTask.length}/200
              </span>
            </div>
            <button
              type="submit"
              disabled={!newTask.trim() || creating}
              className="w-full mt-4 px-6 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Breaking down...
                </>
              ) : (
                "Break it down"
              )}
            </button>
          </form>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-sm mt-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tasks list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-lg">No tasks yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Create your first task above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSubtaskToggle={handleSubtaskToggle}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
