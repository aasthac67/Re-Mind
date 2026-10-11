import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { createTask, listTasks, projectContext, updateTask } from "@/lib/task-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function authenticated(req: Request) {
  const key = process.env.REMIND_MCP_TOKEN;
  const value = req.headers.get("authorization");
  if (!key || !value) return false;
  const a = Buffer.from(value), b = Buffer.from("Bearer " + key);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function POST(req: Request) {
  if (!authenticated(req)) return new Response("Unauthorized", { status: 401 });
  const server = new McpServer({ name: "remind", version: "0.1.0" });
  const allowed = (process.env.DIAL_ALLOWED_CALLERS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const caller = req.headers.get("x-dial-user-number");
  const authorize = () => {
    if (!caller || !allowed.includes(caller) || req.headers.get("x-dial-direction") !== "inbound" || req.headers.get("x-dial-agent-number") !== process.env.DIAL_NUMBER) throw new Error("This caller is not authorized to access Re:Mind.");
  };
  const result = async (run: () => Promise<unknown>) => {
    try { authorize(); return { content: [{ type: "text" as const, text: JSON.stringify(await run()) }] }; }
    catch (e) { return { isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : "Tool failed" }] }; }
  };
  server.registerTool("list_tasks", { description: "List tasks and IDs. Use this before status updates or answering what is pending.", inputSchema: { project: z.string().optional() } }, ({ project }) => result(async () => (await listTasks()).filter(t => !project || t.project === project)));
  server.registerTool("get_project_context", { description: "Retrieve a project recap and current tasks. Demo context is illustrative; task state is persisted.", inputSchema: { project: z.string() } }, ({ project }) => result(() => projectContext(project)));
  server.registerTool("create_task", { description: "Create a task only after the caller confirms its title and project. This adds a task, it does not book or purchase anything. Reuse requestId for retries.", inputSchema: { title: z.string().trim().min(1).max(500), project: z.enum(["Seattle Trip", "Auth Project", "Personal"]), due: z.string().max(100).optional(), requestId: z.string().min(1).max(100), confirmed: z.literal(true) } }, (input) => result(() => createTask(input, "Dial call")));
  server.registerTool("update_task_status", { description: "Update an exact task ID only after the caller explicitly confirms the change. Never infer completion.", inputSchema: { taskId: z.number().int().positive(), status: z.enum(["suggested", "in-progress", "blocked", "done"]), confirmed: z.literal(true) } }, ({ taskId, status }) => result(() => updateTask(taskId, status, "Dial call")));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try { return await transport.handleRequest(req); } finally { await server.close(); }
}
export async function GET() { return new Response("Method not allowed", { status: 405 }); }
export async function DELETE() { return new Response("Method not allowed", { status: 405 }); }
