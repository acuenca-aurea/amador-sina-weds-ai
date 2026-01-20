import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createTaskSchema } from "@/lib/schemas";
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

    // Generate subtasks using OpenAI
    logger.info("Calling OpenAI for subtasks", { requestId });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a task breakdown assistant. Given a task, break it down into 3-5 specific, actionable subtasks. 
Rules:
- Return ONLY a JSON array of strings
- Each subtask should be a clear action item
- Keep each subtask under 100 characters
- Return between 3 and 5 subtasks
- No explanations, just the JSON array

Example input: "Plan a birthday party"
Example output: ["Send invitations to guests", "Order birthday cake", "Buy decorations", "Plan party games", "Prepare playlist"]`,
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
        { error: "Failed to generate subtasks" },
        { status: 500 }
      );
    }

    let subtaskTexts: string[];
    try {
      subtaskTexts = JSON.parse(content);
      if (!Array.isArray(subtaskTexts) || subtaskTexts.length === 0) {
        throw new Error("Invalid response format");
      }
      subtaskTexts = subtaskTexts.filter(
        (s) => typeof s === "string" && s.trim().length > 0
      );
      if (subtaskTexts.length === 0) {
        throw new Error("No valid subtasks");
      }
    } catch {
      logger.error("Failed to parse OpenAI response", undefined, {
        requestId,
        content,
      });
      return NextResponse.json(
        { error: "Failed to parse subtasks" },
        { status: 500 }
      );
    }

    // Insert task into database
    const { data: newTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: task,
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
