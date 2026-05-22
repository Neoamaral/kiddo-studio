import { NextRequest, NextResponse } from "next/server";
import { generateImage, pollTask } from "@/lib/magnific";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model, resolution, aspect_ratio, wait = false } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const task = await generateImage({ prompt, model, resolution, aspect_ratio });

    if (wait) {
      const result = await pollTask(task.task_id);
      return NextResponse.json(result);
    }

    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
