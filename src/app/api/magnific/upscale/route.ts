import { NextRequest, NextResponse } from "next/server";
import { upscaleImage, pollTask } from "@/lib/magnific";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, scale_factor, prompt, creativity, hdr, resemblance, engine, wait = false } = body;

    if (!image) {
      return NextResponse.json({ error: "image (base64) is required" }, { status: 400 });
    }

    const task = await upscaleImage({ image, scale_factor, prompt, creativity, hdr, resemblance, engine });

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
