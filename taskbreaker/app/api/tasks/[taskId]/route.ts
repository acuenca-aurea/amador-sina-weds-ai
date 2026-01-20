import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

// DELETE /api/tasks/[taskId] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const { taskId } = await params;

  logger.info("API request received", {
    requestId,
    path: `/api/tasks/${taskId}`,
    method: "DELETE",
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

    // Verify the task belongs to the user before deleting
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!existingTask) {
      logger.warn("Task not found or unauthorized", { requestId, taskId });
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      logger.error("Failed to delete task", error as Error, {
        requestId,
        taskId,
      });
      return NextResponse.json(
        { error: "Failed to delete task" },
        { status: 500 }
      );
    }

    logger.info("API request completed", {
      requestId,
      duration: Date.now() - startTime,
      status: 200,
      taskId,
    });

    return NextResponse.json({ success: true });
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
