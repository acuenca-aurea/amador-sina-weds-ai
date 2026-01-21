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

// Schema for validating AI-generated response with title and subtasks
export const aiTaskResponseSchema = z.object({
  title: z.string().min(2).max(50),
  subtasks: z.array(z.string().min(1).max(100)).min(3).max(5),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
export type AITaskResponse = z.infer<typeof aiTaskResponseSchema>;
