import { NextRequest, NextResponse } from "next/server";
import { searchStock } from "@/lib/magnific";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type") as "photo" | "illustration" | "vector" | "icon" | null;
    const limit = searchParams.get("limit");

    if (!query) {
      return NextResponse.json({ error: "query param is required" }, { status: 400 });
    }

    const results = await searchStock({
      query,
      ...(type && { type }),
      ...(limit && { limit: Number(limit) }),
    });

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
