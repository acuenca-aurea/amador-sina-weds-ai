import { describe, it, expect } from "vitest";
import { aiTaskResponseSchema } from "./task.schema";

describe("aiTaskResponseSchema", () => {
  it("should validate a correct AI response", () => {
    const validResponse = {
      title: "Birthday Party Planning",
      subtasks: [
        "Send party invitations to friends",
        "Order birthday cake and decorations",
        "Plan age-appropriate party games",
      ],
    };

    const result = aiTaskResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Birthday Party Planning");
      expect(result.data.subtasks).toHaveLength(3);
    }
  });

  it("should accept titles with 2-5 words", () => {
    const twoWordTitle = {
      title: "Garage Cleanup",
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    const fiveWordTitle = {
      title: "Home Office Setup Project",
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    expect(aiTaskResponseSchema.safeParse(twoWordTitle).success).toBe(true);
    expect(aiTaskResponseSchema.safeParse(fiveWordTitle).success).toBe(true);
  });

  it("should reject titles shorter than 2 characters", () => {
    const invalidResponse = {
      title: "A",
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject titles longer than 50 characters", () => {
    const invalidResponse = {
      title:
        "This is a very long title that exceeds the fifty character limit for task titles",
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject fewer than 3 subtasks", () => {
    const invalidResponse = {
      title: "Valid Title",
      subtasks: ["Task 1", "Task 2"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject more than 5 subtasks", () => {
    const invalidResponse = {
      title: "Valid Title",
      subtasks: [
        "Task 1",
        "Task 2",
        "Task 3",
        "Task 4",
        "Task 5",
        "Task 6",
      ],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject empty subtasks", () => {
    const invalidResponse = {
      title: "Valid Title",
      subtasks: ["Task 1", "", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject subtasks longer than 100 characters", () => {
    const longSubtask =
      "This is a very long subtask that definitely exceeds one hundred characters and should be rejected by the validation schema";

    const invalidResponse = {
      title: "Valid Title",
      subtasks: [longSubtask, "Task 2", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should handle exactly 3 subtasks", () => {
    const response = {
      title: "Valid Title",
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("should handle exactly 5 subtasks", () => {
    const response = {
      title: "Valid Title",
      subtasks: ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"],
    };

    const result = aiTaskResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("should reject missing title", () => {
    const invalidResponse = {
      subtasks: ["Task 1", "Task 2", "Task 3"],
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("should reject missing subtasks", () => {
    const invalidResponse = {
      title: "Valid Title",
    };

    const result = aiTaskResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});
