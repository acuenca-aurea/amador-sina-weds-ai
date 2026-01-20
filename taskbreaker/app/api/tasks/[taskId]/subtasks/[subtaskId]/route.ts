import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSubtaskSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

// PATCH /api/tasks/[taskId]/subtasks/[subtaskId] - Update subtask checked state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const { taskId, subtaskId } = await params;

  logger.info("API request received", {
    requestId,
    path: `/api/tasks/${taskId}/subtasks/${subtaskId}`,
    method: "PATCH",
  });

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized access attempt", { requestId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSubtaskSchema.safeParse(body);

    if (!result.success) {
      logger.warn("Validation failed", {
        requestId,
        errors: result.error.issues,
      });
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify the task belongs to the user
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) {
      logger.warn("Task not found or unauthorized", { requestId, taskId });
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the subtask
    const { data: subtask, error } = await supabase
      .from("subtasks")
      .update({ checked: result.data.checked } as { checked: boolean })
      .eq("id", subtaskId)
      .eq("task_id", taskId)
      .select("id, text, checked, position")
      .single();

    if (error || !subtask) {
      logger.error("Failed to update subtask", error as Error, {
        requestId,
        subtaskId,
      });
      return NextResponse.json(
        { error: "Failed to update subtask" },
        { status: 500 }
      );
    }

    logger.info("API request completed", {
      requestId,
      duration: Date.now() - startTime,
      status: 200,
      subtaskId,
      checked: result.data.checked,
    });

    return NextResponse.json({ subtask });
  } catch (error) {
    logger.error("API request failed", error as Error, {
      requestId,
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
