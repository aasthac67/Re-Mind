import { NextResponse } from "next/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Task } from "@/lib/workspace";

export const runtime = "nodejs";

type ContextProject = {
  id: string;
  name: string;
  summary: string;
  decisions: string[];
  next: string;
  sources: number;
  timeline?: unknown[];
  updatedAt: string;
};

type CodexSuggestion = {
  matchedProjectId: string;
  confidence: number;
  reason: string;
  suggestedPrompt: string;
};

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return typeof task.id === "number" && typeof task.title === "string" && typeof task.project === "string" && typeof task.status === "string";
}

async function getLatestContext(request: Request) {
  const contextUrl = process.env.CONTEXT_HUB_API_URL ?? new URL("/api/context-hub", request.url).toString();
  const response = await fetch(contextUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Context Hub could not provide the latest project data.");

  const payload = await response.json() as { projects?: ContextProject[] };
  if (!Array.isArray(payload.projects)) throw new Error("Context Hub returned an invalid project list.");
  return payload.projects;
}

async function runCodex(task: Task, projects: ContextProject[], selectedProjectId?: string) {
  const runDirectory = await mkdtemp(join(tmpdir(), "remind-codex-"));
  const schemaPath = join(runDirectory, "handoff-schema.json");
  const outputPath = join(runDirectory, "handoff.json");
  const projectIds = [...projects.map((project) => project.id), "unassigned"];
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["matchedProjectId", "confidence", "reason", "suggestedPrompt"],
    properties: {
      matchedProjectId: { type: "string", enum: projectIds },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string" },
      suggestedPrompt: { type: "string" },
    },
  };

  const instruction = [
    "You are Re:Mind's task-continuation matcher.",
    "Return only JSON that satisfies the supplied schema.",
    "Use only the task and Context Hub data below. Do not claim access to chats, repositories, files, tools, or the internet.",
    "Match the task to one project when evidence is strong. Otherwise use unassigned with low confidence.",
    selectedProjectId ? `The user explicitly selected project ID '${selectedProjectId}'. Keep that match and write the prompt from that project's context.` : "",
    "The suggestedPrompt must be ready to paste into another agent. It should preserve relevant decisions, include the task and next action, and ask only essential clarifying questions.",
    "\nTASK\n" + JSON.stringify(task),
    "\nLATEST CONTEXT HUB PROJECTS\n" + JSON.stringify(projects),
  ].filter(Boolean).join("\n");

  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.env.CODEX_CLI_PATH ?? "codex", [
        "exec",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox", "read-only",
        "--output-schema", schemaPath,
        "--output-last-message", outputPath,
        "-",
      ], { cwd: runDirectory, stdio: ["pipe", "ignore", "pipe"] });
      let errorOutput = "";
      child.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });
      child.once("error", reject);
      child.once("close", (code) => code === 0 ? resolve() : reject(new Error(errorOutput || "Codex CLI did not complete the handoff.")));
      child.stdin.end(instruction);
    });

    return JSON.parse(await readFile(outputPath, "utf8")) as CodexSuggestion;
  } finally {
    await rm(runDirectory, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { task?: unknown; selectedProjectId?: unknown } | null;
  if (!isTask(body?.task)) return NextResponse.json({ error: "A complete task is required." }, { status: 400 });

  try {
    const projects = await getLatestContext(request);
    const selectedProjectId = typeof body?.selectedProjectId === "string" ? body.selectedProjectId : undefined;
    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      return NextResponse.json({ error: "That project is no longer available in Context Hub." }, { status: 400 });
    }

    const suggestion = await runCodex(body.task, projects, selectedProjectId);
    if (!projects.some((project) => project.id === suggestion.matchedProjectId) && suggestion.matchedProjectId !== "unassigned") {
      throw new Error("Codex returned a project that is not in the latest Context Hub data.");
    }
    return NextResponse.json({ suggestion, projects });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare a handoff." }, { status: 502 });
  }
}
