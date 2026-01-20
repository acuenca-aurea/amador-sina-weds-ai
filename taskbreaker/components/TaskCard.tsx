"use client";

import { useState } from "react";

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

interface TaskCardProps {
  task: Task;
  onSubtaskToggle: (taskId: string, subtaskId: string, checked: boolean) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export default function TaskCard({ task, onSubtaskToggle, onDelete }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingSubtask, setTogglingSubtask] = useState<string | null>(null);

  const handleToggle = async (subtask: Subtask) => {
    setTogglingSubtask(subtask.id);
    try {
      await onSubtaskToggle(task.id, subtask.id, !subtask.checked);
    } finally {
      setTogglingSubtask(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const completedCount = task.subtasks.filter((s) => s.checked).length;
  const totalCount = task.subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const sortedSubtasks = [...task.subtasks].sort((a, b) => a.position - b.position);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 transition-all hover:border-slate-600">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-slate-100 truncate">
            {task.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {completedCount}/{totalCount} completed
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          title="Delete task"
        >
          {isDeleting ? (
            <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-2">
        {sortedSubtasks.map((subtask) => (
          <li
            key={subtask.id}
            onClick={() => handleToggle(subtask)}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              togglingSubtask === subtask.id
                ? "opacity-50 pointer-events-none"
                : "hover:bg-slate-700/50"
            }`}
          >
            <div
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                subtask.checked
                  ? "bg-amber-500 border-amber-500"
                  : "border-slate-600"
              }`}
            >
              {subtask.checked && (
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
              className={`text-sm transition-all duration-200 ${
                subtask.checked
                  ? "text-slate-500 line-through"
                  : "text-slate-300"
              }`}
            >
              {subtask.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
