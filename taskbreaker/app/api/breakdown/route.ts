import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task } = body;

    if (!task || typeof task !== "string") {
      return NextResponse.json(
        { error: "Task is required" },
        { status: 400 }
      );
    }

    const trimmedTask = task.trim();
    if (trimmedTask.length === 0) {
      return NextResponse.json(
        { error: "Task cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedTask.length > 200) {
      return NextResponse.json(
        { error: "Task must be 200 characters or less" },
        { status: 400 }
      );
    }

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
          content: trimmedTask,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate subtasks" },
        { status: 500 }
      );
    }

    let subtasks: string[];
    try {
      subtasks = JSON.parse(content);
      if (!Array.isArray(subtasks) || subtasks.length === 0) {
        throw new Error("Invalid response format");
      }
      subtasks = subtasks.filter(
        (s) => typeof s === "string" && s.trim().length > 0
      );
      if (subtasks.length === 0) {
        throw new Error("No valid subtasks");
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse subtasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtasks });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to break down task. Please try again." },
      { status: 500 }
    );
  }
}
