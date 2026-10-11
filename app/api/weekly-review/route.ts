import { NextResponse } from "next/server";
import { getWeeklyReview } from "@/lib/alike/weekly-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const review = await getWeeklyReview();
  return NextResponse.json(review, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
