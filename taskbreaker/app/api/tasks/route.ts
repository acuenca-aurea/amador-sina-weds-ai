import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createTaskSchema, aiTaskResponseSchema } from "@/lib/schemas";
import logger from "@/lib/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /api/tasks - Get all tasks for the current user
export async function GET() {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.info("API request received", {
    requestId,
    path: "/api/tasks",
    method: "GET",
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

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        created_at,
        subtasks (
          id,
          text,
          checked,
          position
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Database error fetching tasks", error as Error, {
        requestId,
      });
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    logger.info("API request completed", {
      requestId,
      duration: Date.now() - startTime,
      status: 200,
      taskCount: tasks?.length || 0,
    });

    return NextResponse.json({ tasks });
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

// POST /api/tasks - Create a new task with AI-generated subtasks
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.info("API request received", {
    requestId,
    path: "/api/tasks",
    method: "POST",
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
    const result = createTaskSchema.safeParse(body);

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

    const { task } = result.data;

    // Generate title and subtasks using OpenAI (combined prompt for efficiency)
    logger.info("Calling OpenAI for title and subtasks", { requestId });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a task organization assistant. Given a task description, you will:
1. Generate a short, friendly title (2-5 words) that captures the essence of the task
2. Break down the task into 3-5 specific, actionable subtasks

Rules for title:
- Keep it between 2-5 words
- Use title case (capitalize major words)
- Make it scannable and memorable
- Avoid articles (a, an, the) when possible
- No punctuation at the end

Rules for subtasks:
- Each subtask should be a clear action item
- Keep each subtask under 100 characters
- Return between 3 and 5 subtasks

Return a JSON object with this exact structure:
{
  "title": "Friendly Title Here",
  "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3"]
}

Example input: "Plan my daughter's 5th birthday party for Saturday"
Example output: {"title": "Birthday Party Planning", "subtasks": ["Send party invitations to friends", "Order birthday cake and decorations", "Plan age-appropriate party games", "Prepare goody bags for guests", "Set up party area"]}`,
        },
        {
          role: "user",
          content: task,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      logger.error("OpenAI returned empty content", undefined, { requestId });
      return NextResponse.json(
        { error: "Failed to generate task breakdown" },
        { status: 500 }
      );
    }

    // Parse and validate AI response with fallback for title
    let friendlyTitle: string = task; // Fallback to original input
    let subtaskTexts: string[];

    try {
      const parsed = JSON.parse(content);
      const validated = aiTaskResponseSchema.safeParse(parsed);

      if (validated.success) {
        friendlyTitle = validated.data.title;
        subtaskTexts = validated.data.subtasks;
        logger.info("AI generated friendly title", {
          requestId,
          originalTask: task,
          generatedTitle: friendlyTitle,
        });
      } else {
        // Try to extract subtasks even if title validation fails
        logger.warn("AI response validation failed, attempting partial parse", {
          requestId,
          errors: validated.error.issues,
        });

        if (Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
          subtaskTexts = parsed.subtasks.filter(
            (s: unknown) => typeof s === "string" && (s as string).trim().length > 0
          );
          // Use title if present and reasonable, otherwise fallback
          if (typeof parsed.title === "string" && parsed.title.trim().length >= 2) {
            friendlyTitle = parsed.title.trim().slice(0, 50);
          }
        } else {
          throw new Error("Could not extract subtasks from response");
        }
      }

      // Final validation: ensure we have subtasks
      if (!subtaskTexts || subtaskTexts.length === 0) {
        throw new Error("No valid subtasks generated");
      }
    } catch (parseError) {
      logger.error("Failed to parse OpenAI response", parseError as Error, {
        requestId,
        content,
      });
      return NextResponse.json(
        { error: "Failed to parse task breakdown" },
        { status: 500 }
      );
    }

    // Insert task into database with AI-generated title
    const { data: newTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: friendlyTitle,
      })
      .select("id, title, created_at")
      .single();

    if (taskError || !newTask) {
      logger.error("Failed to create task", taskError as Error, { requestId });
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      );
    }

    const taskId = newTask.id as string;

    // Insert subtasks
    const subtasksToInsert = subtaskTexts.map((text, index) => ({
      task_id: taskId,
      text: text.trim(),
      checked: false,
      position: index,
    }));

    const { data: subtasks, error: subtasksError } = await supabase
      .from("subtasks")
      .insert(subtasksToInsert)
      .select("id, text, checked, position");

    if (subtasksError) {
      logger.error("Failed to create subtasks", subtasksError as Error, {
        requestId,
      });
      // Clean up the task if subtasks failed
      await supabase.from("tasks").delete().eq("id", taskId);
      return NextResponse.json(
        { error: "Failed to create subtasks" },
        { status: 500 }
      );
    }

    logger.info("API request completed", {
      requestId,
      duration: Date.now() - startTime,
      status: 201,
      taskId: newTask.id,
      subtaskCount: subtasks?.length || 0,
    });

    return NextResponse.json(
      {
        task: {
          ...newTask,
          subtasks,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("API request failed", error as Error, {
      requestId,
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Failed to create task. Please try again." },
      { status: 500 }
    );
  }
}
