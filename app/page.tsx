"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Copy,
  FileText,
  Filter,
  Inbox,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { ReviewActivity, ReviewCategory, WeeklyReview } from "@/lib/weekly-review/types";

type Hub = "context" | "action";
type TaskStatus = "suggested" | "in-progress" | "blocked" | "done";

type Task = {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  due?: string;
  priority?: "High" | "Medium";
  detail?: string;
};

type Project = {
  id: string;
  category: ReviewCategory;
  name: string;
  sources: number;
  open: number;
  summary: string;
  decisions: string[];
  next?: string;
};

const categoryColors: Record<ReviewCategory, string> = {
  "Trips & Hobbies": "#f4a07a",
  "Health & Workouts": "#c9e8c4",
  "Work & Learning": "#aebce9",
  "Personal / Admin": "#ead58c",
};

const statusMeta: Record<TaskStatus, { label: string; color: string }> = {
  suggested: { label: "Suggested", color: "#e6b45f" },
  "in-progress": { label: "In progress", color: "#89a8e9" },
  blocked: { label: "Blocked", color: "#e88772" },
  done: { label: "Done", color: "#75aa80" },
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function projectFromActivities(name: string, activities: ReviewActivity[]): Project {
  const nextAction = activities.find((activity) => activity.kind === "next_action");
  const update = activities.find((activity) => activity.kind === "update");
  const category = activities[0].category;
  return {
    id: slug(name),
    category,
    name,
    sources: new Set(activities.map((activity) => activity.sourceRef ?? activity.sourceLabel)).size,
    open: activities.filter((activity) => activity.kind === "next_action" || activity.kind === "blocker").length,
    summary: update?.detail ?? activities[0].detail,
    decisions: activities.filter((activity) => activity.kind === "commitment").map((activity) => activity.title).slice(0, 2),
    next: nextAction?.title,
  };
}

function projectsFromReview(review: WeeklyReview | null) {
  if (!review) return [];
  const groups = new Map<string, ReviewActivity[]>();
  for (const activity of review.activities) groups.set(activity.project, [...(groups.get(activity.project) ?? []), activity]);
  return Array.from(groups.entries()).map(([name, activities]) => projectFromActivities(name, activities));
}

function statusFor(activity: ReviewActivity): TaskStatus {
  if (activity.kind === "blocker") return "blocked";
  if (activity.kind === "commitment" || activity.kind === "update") return "in-progress";
  return "suggested";
}

function tasksFromReview(review: WeeklyReview | null): Task[] {
  if (!review) return [];
  return review.activities
    .filter((activity) => activity.kind !== "update" || Boolean(activity.title))
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      project: activity.project,
      status: statusFor(activity),
      due: activity.occurredOn,
      priority: activity.kind === "blocker" ? "High" : "Medium",
      detail: activity.detail,
    }));
}

export default function Home() {
  const [hub, setHub] = useState<Hub>("context");
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [manualTasks, setManualTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [toast, setToast] = useState("");

  const loadContext = useCallback(async () => {
    setReviewLoading(true);
    try {
      const response = await fetch("/api/weekly-review", { cache: "no-store" });
      if (!response.ok) throw new Error("Context request failed");
      setReview(await response.json() as WeeklyReview);
    } catch {
      setReview(null);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const projects = useMemo(() => projectsFromReview(review), [review]);
  const selected = projects.find((project) => project.id === selectedProject) ?? projects[0] ?? null;
  const tasks = useMemo(() => [...tasksFromReview(review), ...manualTasks], [manualTasks, review]);
  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((task) => `${task.title} ${task.project} ${task.detail}`.toLowerCase().includes(term));
  }, [search, tasks]);

  useEffect(() => {
    if (!selectedProject && projects[0]) setSelectedProject(projects[0].id);
  }, [projects, selectedProject]);

  function cycleTask(id: string) {
    const order: TaskStatus[] = ["suggested", "in-progress", "blocked", "done"];
    setManualTasks((current) => current.map((task) => task.id === id ? { ...task, status: order[(order.indexOf(task.status) + 1) % order.length] } : task));
    setToast("Task status changes are kept locally in this prototype.");
    window.setTimeout(() => setToast(""), 2600);
  }

  function addTask() {
    if (!newTask.trim()) return;
    setManualTasks((current) => [{ id: `manual-${Date.now()}`, title: newTask.trim(), project: selected?.name ?? "Personal", status: "suggested", priority: "Medium", detail: "Captured in Re:Mind" }, ...current]);
    setNewTask("");
    setShowAdd(false);
    setToast("Task added to Suggested");
    window.setTimeout(() => setToast(""), 2500);
  }

  function copyContext() {
    if (!selected) return;
    const text = `${selected.name}\n${selected.summary}\n${selected.next ? `Next: ${selected.next}` : ""}`;
    navigator.clipboard?.writeText(text);
    setToast("Context copied");
    window.setTimeout(() => setToast(""), 2500);
  }

  const categoryCounts = review?.categoryCounts ?? { "Trips & Hobbies": 0, "Health & Workouts": 0, "Work & Learning": 0, "Personal / Admin": 0 };

  return <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1440px] gap-4">
    <aside className="hidden w-[238px] shrink-0 flex-col rounded-[26px] bg-ink p-5 text-white shadow-soft lg:flex"><div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-ink"><Sparkles size={18} /></div><div><div className="serif text-xl leading-none">Re:Mind</div><div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/50">Continuity layer</div></div></div><div className="mt-11 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your workspace</div><nav className="mt-3 space-y-1"><SideNav icon={<Inbox size={16} />} label="Home" active={hub === "context"} onClick={() => setHub("context")} /><SideNav icon={<Check size={16} />} label="Action Hub" active={hub === "action"} onClick={() => setHub("action")} badge={String(tasks.filter((task) => task.status !== "done").length)} /><SideNav icon={<FileText size={16} />} label="Context" /></nav><div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your week</div><div className="mt-3 space-y-1">{(Object.keys(categoryCounts) as ReviewCategory[]).map((category) => <div key={category} className="flex items-center justify-between rounded-xl px-2 py-2 text-xs text-white/65"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: categoryColors[category] }} />{category}</span><span className="text-white/35">{categoryCounts[category]}</span></div>)}</div><div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Phone size={14} className="text-mint" /> Call Re:Mind</div><p className="mt-2 text-[11px] leading-relaxed text-white/45">Capture a task or ask where you left off.</p><button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-mint">View number <ArrowUpRight size={12} /></button></div></aside>
    <section className="grain min-w-0 flex-1 rounded-[26px] border border-white/70 bg-white/55 shadow-soft backdrop-blur-sm"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8"><div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-mint"><Sparkles size={18} /></div><span className="serif text-xl">Re:Mind</span></div><div className="relative order-3 w-full sm:order-none sm:max-w-[310px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss/60" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your context..." className="h-10 w-full rounded-xl border border-[var(--line)] bg-white/70 pl-9 pr-3 text-xs outline-none placeholder:text-moss/60 focus:border-moss" /></div><div className="flex items-center gap-3"><button className="relative rounded-xl p-2 text-moss hover:bg-white"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" /></button><div className="h-8 w-px bg-[var(--line)]" /><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6b894] text-xs font-bold">VK</div><span className="hidden text-xs font-semibold sm:block">Vikram</span><ChevronDown size={14} className="text-moss/60" /></div></div></header>
      <div className="px-5 pb-10 pt-7 sm:px-8 sm:pt-9"><HomeHero review={review} loading={reviewLoading} onRefresh={loadContext} /><div className="mt-9 flex items-center justify-between border-b border-[var(--line)]"><div className="flex gap-6"><HubTab active={hub === "context"} onClick={() => setHub("context")} label="Context Hub" caption="Where did I leave off?" /><HubTab active={hub === "action"} onClick={() => setHub("action")} label="Action Hub" caption="What should I do next?" /></div><div className="hidden items-center gap-2 pb-3 text-[11px] text-moss sm:flex"><span className="h-2 w-2 rounded-full bg-[#74aa7e]" /> Updated from your recent context</div></div>{hub === "context" ? <ContextView projects={projects} selected={selected} selectedProject={selectedProject} setSelectedProject={setSelectedProject} loading={reviewLoading} onCopy={copyContext} /> : <ActionView tasks={visibleTasks} suggested={review?.suggestedNextActions ?? []} onCycle={cycleTask} onAdd={() => setShowAdd(true)} />}</div>
    </section></div>{showAdd && <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-moss">Manual capture</div><h2 className="serif mt-2 text-3xl">What needs doing?</h2></div><button onClick={() => setShowAdd(false)} className="rounded-full p-2 text-moss hover:bg-paper"><X size={18} /></button></div><input autoFocus value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Send an update" className="mt-6 h-12 w-full rounded-xl border border-[var(--line)] bg-paper px-4 text-sm outline-none focus:border-moss" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-moss">Cancel</button><button onClick={addTask} className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white">Add to Action Hub</button></div></div></div>}{toast && <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">{toast}</div>}</main>;
}

function HomeHero({ review, loading, onRefresh }: { review: WeeklyReview | null; loading: boolean; onRefresh: () => void }) {
  const hasContext = review?.mode === "live";
  return <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> {loading ? "Gathering recent context" : hasContext ? "Your week, connected" : "Ready when you are"}</div><h1 className="serif text-[clamp(2.2rem,5vw,4.2rem)] leading-[0.95] tracking-[-0.045em]">{hasContext ? <>Pick up where<br /><em className="text-moss">you left off.</em></> : <>Your context,<br /><em className="text-moss">when you need it.</em></>}</h1><p className="mt-4 max-w-[570px] text-sm leading-relaxed text-moss">{loading ? "Looking across your recent work and conversations…" : review?.summary ?? "Refresh when you have recent context to bring together."}</p></div><div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4 text-right"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss">Recent activity</div><div className="mt-1 text-2xl font-bold">{review?.activities.length ?? "—"}<span className="ml-1 text-sm font-normal text-moss">signals found</span></div><button onClick={onRefresh} className="mt-3 ml-auto flex items-center gap-1 text-[11px] font-semibold text-[#4e8d62]"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh context</button></div></div>;
}

function SideNav({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) { return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><span className="flex items-center gap-3">{icon}{label}</span>{badge && <span className="rounded-full bg-coral px-1.5 py-0.5 text-[9px] text-ink">{badge}</span>}</button>; }
function HubTab({ active, onClick, label, caption }: { active: boolean; onClick: () => void; label: string; caption: string }) { return <button onClick={onClick} className={`relative pb-3 text-left transition ${active ? "text-ink" : "text-moss/50 hover:text-moss"}`}><div className="text-sm font-bold">{label}</div><div className="mt-1 text-[10px]">{caption}</div>{active && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-ink" />}</button>; }

function ContextView({ projects, selected, selectedProject, setSelectedProject, loading, onCopy }: { projects: Project[]; selected: Project | null; selectedProject: string | null; setSelectedProject: (id: string) => void; loading: boolean; onCopy: () => void }) {
  if (loading) return <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-3xl bg-white/60" /><div className="h-48 animate-pulse rounded-3xl bg-white/60" /></div>;
  if (!projects.length) return <div className="mt-7 rounded-3xl border border-dashed border-[var(--line)] bg-white/45 px-6 py-10 text-center"><Sparkles className="mx-auto text-moss" size={22} /><h2 className="serif mt-4 text-3xl">Nothing to reconstruct yet.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-moss">Create or continue a coding-agent chat, then refresh this page. Re:Mind will turn that context into project threads and next steps.</p></div>;
  return <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Living project threads <span className="ml-1 text-moss/40">{projects.length}</span></h2><button className="flex items-center gap-1 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button></div><div className="space-y-3">{projects.map((project) => <ProjectCard key={project.id} project={project} active={selectedProject === project.id} onClick={() => setSelectedProject(project.id)} />)}</div></div>{selected && <ProjectDetail project={selected} onCopy={onCopy} />}</div>;
}

function ProjectCard({ project, active, onClick }: { project: Project; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`w-full rounded-3xl border p-5 text-left transition ${active ? "border-ink/20 bg-white shadow-soft" : "border-[var(--line)] bg-white/55 hover:border-moss/40 hover:bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColors[project.category] }} />{project.category}</div><MoreHorizontal size={17} className="text-moss/45" /></div><div className="mt-3 flex items-end justify-between gap-4"><div><h3 className="serif text-[27px] leading-none">{project.name}</h3><p className="mt-2 text-[11px] text-moss/65">Updated from recent context</p></div><div className="flex shrink-0 gap-1.5 text-[10px] text-moss"><span className="rounded-full bg-paper px-2 py-1">{project.sources} signals</span><span className="rounded-full bg-paper px-2 py-1">{project.open} open</span></div></div><p className="mt-4 max-w-[500px] text-xs leading-relaxed text-moss">{project.summary}</p>{project.next && <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--line)] pt-3 text-[11px] font-semibold"><ArrowUpRight size={14} className="text-moss" /> Next: {project.next}</div>}</button>; }

function ProjectDetail({ project, onCopy }: { project: Project; onCopy: () => void }) { return <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> Context brief</div><button onClick={onCopy} className="rounded-lg p-1.5 text-moss hover:bg-paper" title="Copy context"><Copy size={15} /></button></div><h2 className="serif mt-4 text-3xl leading-none">{project.name}</h2><p className="mt-3 text-sm leading-relaxed text-moss">{project.summary}</p><div className="mt-5 border-t border-[var(--line)] pt-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-moss/60">Commitments kept</div>{project.decisions.length ? <ul className="mt-3 space-y-2">{project.decisions.map((decision) => <li key={decision} className="flex gap-2 text-xs"><Check size={14} className="mt-0.5 shrink-0 text-[#5e9b6c]" />{decision}</li>)}</ul> : <p className="mt-3 text-xs text-moss">No explicit commitments surfaced yet.</p>}</div>{project.next && <div className="mt-5 rounded-2xl bg-[#edf5e9] p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]"><Sparkles size={13} /> Next action</div><div className="mt-2 text-sm font-bold">{project.next}</div></div>}<div className="mt-5 flex items-center gap-1 text-[10px] text-moss/65"><Link2 size={12} /> {project.sources} recent signals connected</div></div>; }

function ActionView({ tasks, suggested, onCycle, onAdd }: { tasks: Task[]; suggested: ReviewActivity[]; onCycle: (id: string) => void; onAdd: () => void }) { const statuses: TaskStatus[] = ["suggested", "in-progress", "blocked", "done"]; return <div className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="serif text-3xl">Your next few moves</h2><p className="mt-1 text-xs text-moss">Suggestions stay editable and never change task status by themselves.</p></div><div className="flex gap-2"><button className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-[11px] font-bold text-white"><Plus size={14} /> Add task</button></div></div>{suggested.length > 0 && <div className="mt-5 rounded-2xl border border-[#cddfc8] bg-[#f3f8f0] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]">Recently surfaced</div><div className="mt-2 flex flex-wrap gap-2">{suggested.map((action) => <span key={action.id} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink">{action.title}</span>)}</div></div>}<div className="mt-6 grid gap-3 lg:grid-cols-4">{statuses.map((status) => <div key={status} className="min-h-[270px] rounded-2xl border border-[var(--line)] bg-white/45 p-3"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-moss"><span className="h-2 w-2 rounded-full" style={{ background: statusMeta[status].color }} />{statusMeta[status].label}</div><span className="text-[10px] text-moss/50">{tasks.filter((task) => task.status === status).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} onCycle={() => onCycle(task.id)} />)}</div>{status === "suggested" && <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] py-2 text-[10px] font-bold text-moss/65 hover:bg-white"><Plus size={12} /> Add task</button>}</div>)}</div></div>; }

function TaskCard({ task, onCycle }: { task: Task; onCycle: () => void }) { return <div className="rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm"><div className="flex items-start gap-2"><button onClick={onCycle} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${task.status === "done" ? "border-[#75aa80] bg-[#75aa80] text-white" : "border-moss/35 text-transparent hover:border-moss"}`}>{task.status === "done" ? <Check size={10} /> : <Circle size={8} fill="currentColor" />}</button><div className={`text-xs font-semibold leading-relaxed ${task.status === "done" ? "text-moss/45 line-through" : ""}`}>{task.title}</div></div><div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6"><span className="rounded bg-[#edf5e9] px-1.5 py-1 text-[9px] font-bold text-[#54845e]">{task.project}</span>{task.priority && <span className={`rounded px-1.5 py-1 text-[9px] font-bold ${task.priority === "High" ? "bg-[#fff0ea] text-[#b7684d]" : "bg-paper text-moss"}`}>{task.priority}</span>}</div><div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 pl-6 text-[9px] text-moss/60"><span className="flex items-center gap-1"><MessageCircle size={10} /> Recent context</span>{task.due && <span className="flex items-center gap-1"><Clock3 size={10} />{task.due}</span>}</div></div>; }
