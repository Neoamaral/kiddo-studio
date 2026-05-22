import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/magnific";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await getTask(params.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
