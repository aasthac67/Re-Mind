import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { initialTasks, projects, type Task, type TaskStatus } from "./demo-data";

type Store = { tasks: Task[]; events: { at: string; type: string; taskId: number; source: string }[]; requests: Record<string, number> };
const dir = path.join(process.cwd(), ".remind");
const file = path.join(dir, "state.json");
const state = globalThis as typeof globalThis & { remindQueue?: Promise<unknown> };
async function read(): Promise<Store> {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; const initial: Store = { tasks: structuredClone(initialTasks), events: [], requests: {} }; await save(initial); return initial; }
}
function locked<T>(action: () => Promise<T>): Promise<T> {
  const result = (state.remindQueue ?? Promise.resolve()).then(action, action);
  state.remindQueue = result.catch(() => {});
  return result;
}
async function save(data: Store) {
  await mkdir(dir, { recursive: true });
  const temp = file + ".tmp";
  await writeFile(temp, JSON.stringify(data, null, 2));
  await rename(temp, file);
}
export async function listTasks() { return locked(async () => (await read()).tasks); }
export async function createTask(input: { title: string; project: string; due?: string; requestId: string }, source: string) {
  return locked(async () => {
    const data = await read();
    if (!projects.some(p => p.name === input.project) && input.project !== "Personal") throw new Error("Unknown project. Ask the caller to select an existing project.");
    if (Object.hasOwn(data.requests, input.requestId)) return data.tasks.find(t => t.id === data.requests[input.requestId])!;
    const duplicate = data.tasks.find(t => t.project === input.project && t.title.toLowerCase() === input.title.trim().toLowerCase() && t.status !== "done");
    if (duplicate) return duplicate;
    const task: Task = { id: Math.max(Date.now(), ...data.tasks.map(t => t.id + 1)), title: input.title.trim(), project: input.project, due: input.due, status: "suggested", priority: "Medium", source };
    data.tasks.unshift(task); data.requests[input.requestId] = task.id;
    data.events.push({ at: new Date().toISOString(), type: "task.created", taskId: task.id, source });
    await save(data); return task;
  });
}
export async function updateTask(id: number, status: TaskStatus, source: string) {
  return locked(async () => {
    const data = await read(); const task = data.tasks.find(t => t.id === id);
    if (!task) throw new Error("Task not found. List tasks first to obtain its ID.");
    task.status = status;
    data.events.push({ at: new Date().toISOString(), type: "task.status_changed", taskId: id, source });
    await save(data); return task;
  });
}
export async function projectContext(name: string) {
  const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase() || p.id === name.toLowerCase());
  if (!project) throw new Error("Unknown project. Available projects: Seattle Trip, Auth Project.");
  return { ...project, demoContext: true, tasks: (await listTasks()).filter(t => t.project === project.name) };
}
