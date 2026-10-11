import { NextResponse } from "next/server";
import { projects } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Temporary stand-in for the Context Hub service. Action Hub fetches this
// endpoint instead of importing Context Hub records directly, so replacing it
// with the teammate's live API only changes one server-side URL.
export async function GET() {
  return NextResponse.json({
    projects: projects.map(({ id, name, summary, decisions, next, sources, timeline, kicker }) => ({
      id,
      name,
      summary,
      decisions,
      next,
      sources,
      timeline,
      updatedAt: kicker,
    })),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
