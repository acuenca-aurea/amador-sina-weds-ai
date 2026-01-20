import { z } from "zod";

export const createTaskSchema = z.object({
  task: z
    .string()
    .min(1, "Task is required")
    .max(200, "Task must be 200 characters or less")
    .trim(),
});

export const updateSubtaskSchema = z.object({
  checked: z.boolean(),
});

export const subtaskIdSchema = z.object({
  subtaskId: z.string().uuid("Invalid subtask ID"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
