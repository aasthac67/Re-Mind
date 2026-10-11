import { z } from "zod";
import { createTask, listTasks, updateTask } from "@/lib/task-store";
import { localRequest } from "@/lib/local-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const create = z.object({ title: z.string().trim().min(1).max(500), project: z.string().min(1), due: z.string().max(100).optional(), requestId: z.string().min(1).max(100) });
const update = z.object({ id: z.number().int().positive(), status: z.enum(["suggested", "in-progress", "blocked", "done"]) });
export async function GET(req: Request) {
  if (!localRequest(req)) return new Response("Forbidden", { status: 403 });
  return Response.json({ tasks: await listTasks() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  if (!localRequest(req)) return new Response("Forbidden", { status: 403 });
  try { return Response.json({ task: await createTask(create.parse(await req.json()), "Manual capture") }); }
  catch { return Response.json({ error: "Unable to create task. Check title and project." }, { status: 400 }); }
}
export async function PATCH(req: Request) {
  if (!localRequest(req)) return new Response("Forbidden", { status: 403 });
  try { const input = update.parse(await req.json()); return Response.json({ task: await updateTask(input.id, input.status, "Dashboard") }); }
  catch { return Response.json({ error: "Unable to update task." }, { status: 400 }); }
}
