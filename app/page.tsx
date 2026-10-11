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
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { WeeklyReviewPanel } from "@/components/weekly-review-panel";
import type { WeeklyReview } from "@/lib/weekly-review/types";

type Hub = "context" | "action";
type TaskStatus = "suggested" | "in-progress" | "blocked" | "done";

type Task = {
  id: number;
  title: string;
  project: string;
  source?: string;
  status: TaskStatus;
  due?: string;
  priority?: "High" | "Medium";
};

const categories = [
  { label: "Trips & Hobbies", count: 1, color: "#f4a07a" },
  { label: "Health & Workouts", count: 0, color: "#c9e8c4" },
  { label: "Work & Learning", count: 1, color: "#aebce9" },
  { label: "Personal / Admin", count: 0, color: "#ead58c" },
];

const projects = [
  {
    id: "seattle",
    category: "Trips & Hobbies",
    name: "Seattle Trip",
    kicker: "Updated 12 min ago",
    sources: 3,
    open: 2,
    summary: "Four days of nature, one day trip, and a rental decision still open.",
    decisions: ["Itinerary drafted", "Car only for the day trip"],
    next: "Compare rental pickup dates",
    tone: "orange",
  },
  {
    id: "auth",
    category: "Work & Learning",
    name: "Auth Project",
    kicker: "Updated yesterday",
    sources: 1,
    open: 1,
    summary: "Login endpoint is shipped; refresh-token coverage is the loose end.",
    decisions: ["Access token flow is live"],
    next: "Add expired-token test coverage",
    tone: "blue",
  },
];

const initialTasks: Task[] = [
  { id: 1, title: "Compare / book Seattle rental car", project: "Seattle Trip", source: "Dial capture", status: "suggested", due: "Next week", priority: "High" },
  { id: 2, title: "Confirm day-trip route", project: "Seattle Trip", source: "Travel chat · 2 sources", status: "in-progress", due: "Nov 18", priority: "Medium" },
  { id: 3, title: "Add expired-token test coverage", project: "Auth Project", source: "Codex session", status: "blocked", due: "Today", priority: "High" },
  { id: 4, title: "Outline weekend photo walk", project: "Personal", source: "Manual note", status: "done" },
];

const statusMeta: Record<TaskStatus, { label: string; color: string }> = {
  suggested: { label: "Suggested", color: "#e6b45f" },
  "in-progress": { label: "In progress", color: "#89a8e9" },
  blocked: { label: "Blocked", color: "#e88772" },
  done: { label: "Done", color: "#75aa80" },
};

export default function Home() {
  const [hub, setHub] = useState<Hub>("context");
  const [selectedProject, setSelectedProject] = useState("seattle");
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [toast, setToast] = useState("");
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);

  const loadWeeklyReview = useCallback(async () => {
    setReviewLoading(true);
    try {
      const response = await fetch("/api/weekly-review", { cache: "no-store" });
      if (!response.ok) throw new Error("Weekly review request failed");
      setWeeklyReview(await response.json() as WeeklyReview);
    } catch {
      setWeeklyReview(null);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeeklyReview();
  }, [loadWeeklyReview]);

  const selected = projects.find((project) => project.id === selectedProject) ?? projects[0];
  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((task) => `${task.title} ${task.project} ${task.source}`.toLowerCase().includes(term));
  }, [search, tasks]);

  function cycleTask(id: number) {
    const order: TaskStatus[] = ["suggested", "in-progress", "blocked", "done"];
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      const next = order[(order.indexOf(task.status) + 1) % order.length];
      return { ...task, status: next };
    }));
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((current) => [{ id: Date.now(), title: newTask.trim(), project: selected.name, source: "Manual capture", status: "suggested", priority: "Medium" }, ...current]);
    setNewTask("");
    setShowAdd(false);
    setToast("Task added to Suggested");
    window.setTimeout(() => setToast(""), 2500);
  }

  function copyContext() {
    const context = `${selected.name}\n${selected.summary}\nNext action: ${selected.next}`;
    navigator.clipboard?.writeText(context);
    setToast("Context brief copied");
    window.setTimeout(() => setToast(""), 2500);
  }

  return (
    <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] gap-4">
        <aside className="hidden w-[238px] shrink-0 flex-col rounded-[26px] bg-ink p-5 text-white shadow-soft lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-ink"><Sparkles size={18} /></div>
            <div><div className="serif text-xl leading-none">Re:Mind</div><div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/50">Continuity layer</div></div>
          </div>
          <div className="mt-11 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your workspace</div>
          <nav className="mt-3 space-y-1">
            <SideNav icon={<Inbox size={16} />} label="All projects" active={hub === "context"} onClick={() => setHub("context")} />
            <SideNav icon={<Check size={16} />} label="Action Hub" active={hub === "action"} onClick={() => setHub("action")} badge="4" />
            <SideNav icon={<FileText size={16} />} label="Sources" />
          </nav>
          <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Categories</div>
          <div className="mt-3 space-y-1">
            {categories.map((category) => <div key={category.label} className="flex items-center justify-between rounded-xl px-2 py-2 text-xs text-white/65"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: category.color }} />{category.label}</span><span className="text-white/35">{category.count}</span></div>)}
          </div>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Phone size={14} className="text-mint" /> Call Re:Mind</div><p className="mt-2 text-[11px] leading-relaxed text-white/45">Capture a task or ask where you left off.</p><button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-mint">View number <ArrowUpRight size={12} /></button></div>
        </aside>

        <section className="grain min-w-0 flex-1 rounded-[26px] border border-white/70 bg-white/55 shadow-soft backdrop-blur-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-mint"><Sparkles size={18} /></div><span className="serif text-xl">Re:Mind</span></div>
            <div className="relative order-3 w-full sm:order-none sm:max-w-[310px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss/60" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, tasks, sources..." className="h-10 w-full rounded-xl border border-[var(--line)] bg-white/70 pl-9 pr-3 text-xs outline-none placeholder:text-moss/60 focus:border-moss" /></div>
            <div className="flex items-center gap-3"><button className="relative rounded-xl p-2 text-moss hover:bg-white"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" /></button><div className="h-8 w-px bg-[var(--line)]" /><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6b894] text-xs font-bold">VK</div><span className="hidden text-xs font-semibold sm:block">Vikram</span><ChevronDown size={14} className="text-moss/60" /></div></div>
          </header>

          <div className="px-5 pb-10 pt-7 sm:px-8 sm:pt-9">
            <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> Your continuity layer is clear</div><h1 className="serif text-[clamp(2.2rem,5vw,4.2rem)] leading-[0.95] tracking-[-0.045em]">Less remembering.<br /><em className="text-moss">More doing.</em></h1><p className="mt-4 max-w-[540px] text-sm leading-relaxed text-moss">Re:Mind keeps the thread between your conversations, decisions, and the next small thing worth doing.</p></div><div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4 text-right"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss">Last 7 days</div><div className="mt-1 text-2xl font-bold">{weeklyReview?.activities.length ?? "—"}<span className="ml-1 text-sm font-normal text-moss">signals reviewed</span></div><div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#4e8d62]"><ArrowUpRight size={13} /> {weeklyReview?.mode === "live" ? "Alike connected" : "Local review ready"}</div></div></div>

            <div className="mt-9 flex items-center justify-between border-b border-[var(--line)]"><div className="flex gap-6"><HubTab active={hub === "context"} onClick={() => setHub("context")} label="Context Hub" caption="Where did I leave off?" /><HubTab active={hub === "action"} onClick={() => setHub("action")} label="Action Hub" caption="What should I do next?" /></div><div className="hidden items-center gap-2 pb-3 text-[11px] text-moss sm:flex"><span className={`h-2 w-2 rounded-full ${weeklyReview?.mode === "live" ? "bg-[#74aa7e]" : "bg-[#e6b45f]"}`} /> {reviewLoading ? "Checking Alike…" : weeklyReview?.mode === "live" ? "Alike source-backed" : "Alike demo fallback"}</div></div>

            {hub === "context" ? <ContextView selected={selected} selectedProject={selectedProject} setSelectedProject={setSelectedProject} onCopy={copyContext} weeklyReview={weeklyReview} reviewLoading={reviewLoading} onRefreshReview={loadWeeklyReview} /> : <ActionView tasks={visibleTasks} onCycle={cycleTask} onAdd={() => setShowAdd(true)} weeklyReview={weeklyReview} />}
          </div>
        </section>
      </div>

      {showAdd && <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-moss">Manual capture</div><h2 className="serif mt-2 text-3xl">What needs doing?</h2></div><button onClick={() => setShowAdd(false)} className="rounded-full p-2 text-moss hover:bg-paper"><X size={18} /></button></div><input autoFocus value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Send itinerary to Maya" className="mt-6 h-12 w-full rounded-xl border border-[var(--line)] bg-paper px-4 text-sm outline-none focus:border-moss" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-moss">Cancel</button><button onClick={addTask} className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white">Add to Action Hub</button></div></div></div>}
      {toast && <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">{toast}</div>}
    </main>
  );
}

function SideNav({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><span className="flex items-center gap-3">{icon}{label}</span>{badge && <span className="rounded-full bg-coral px-1.5 py-0.5 text-[9px] text-ink">{badge}</span>}</button>;
}

function HubTab({ active, onClick, label, caption }: { active: boolean; onClick: () => void; label: string; caption: string }) {
  return <button onClick={onClick} className={`relative pb-3 text-left transition ${active ? "text-ink" : "text-moss/50 hover:text-moss"}`}><div className="text-sm font-bold">{label}</div><div className="mt-1 text-[10px]">{caption}</div>{active && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-ink" />}</button>;
}

function ContextView({ selected, selectedProject, setSelectedProject, onCopy, weeklyReview, reviewLoading, onRefreshReview }: { selected: (typeof projects)[number]; selectedProject: string; setSelectedProject: (id: string) => void; onCopy: () => void; weeklyReview: WeeklyReview | null; reviewLoading: boolean; onRefreshReview: () => void }) {
  return <><WeeklyReviewPanel review={weeklyReview} loading={reviewLoading} onRefresh={onRefreshReview} /><div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Living project threads <span className="ml-1 text-moss/40">2</span></h2><button className="flex items-center gap-1 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button></div><div className="space-y-3">{projects.map((project) => <ProjectCard key={project.id} project={project} active={selectedProject === project.id} onClick={() => setSelectedProject(project.id)} />)}</div><button className="dashed mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white/40 py-4 text-xs font-bold text-moss hover:bg-white"><Plus size={15} /> Import another conversation</button></div><div className="rounded-3xl border border-[var(--line)] bg-white/75 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> Context brief</div><button onClick={onCopy} className="rounded-lg p-1.5 text-moss hover:bg-paper" title="Copy context"><Copy size={15} /></button></div><h2 className="serif mt-4 text-3xl leading-none">{selected.name}</h2><p className="mt-3 text-sm leading-relaxed text-moss">{selected.summary}</p><div className="mt-5 border-t border-[var(--line)] pt-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-moss/60">Decisions kept</div><ul className="mt-3 space-y-2">{selected.decisions.map((decision) => <li key={decision} className="flex gap-2 text-xs"><Check size={14} className="mt-0.5 shrink-0 text-[#5e9b6c]" />{decision}</li>)}</ul></div><div className="mt-5 rounded-2xl bg-[#edf5e9] p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]"><Sparkles size={13} /> Next action</div><div className="mt-2 text-sm font-bold">{selected.next}</div><button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#54845e]">Open in Action Hub <ArrowUpRight size={12} /></button></div><div className="mt-5 flex items-center justify-between text-[10px] text-moss/65"><span className="flex items-center gap-1"><Link2 size={12} /> {selected.sources} linked sources</span><button className="font-bold text-moss">View timeline</button></div></div></div></>;
}

function ProjectCard({ project, active, onClick }: { project: (typeof projects)[number]; active: boolean; onClick: () => void }) {
  const orange = project.tone === "orange";
  return <button onClick={onClick} className={`w-full rounded-3xl border p-5 text-left transition ${active ? "border-ink/20 bg-white shadow-soft" : "border-[var(--line)] bg-white/55 hover:border-moss/40 hover:bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className={`h-2.5 w-2.5 rounded-full ${orange ? "bg-coral" : "bg-[#9bb0e6]"}`} />{project.category}</div><MoreHorizontal size={17} className="text-moss/45" /></div><div className="mt-3 flex items-end justify-between gap-4"><div><h3 className="serif text-[27px] leading-none">{project.name}</h3><p className="mt-2 text-[11px] text-moss/65">{project.kicker}</p></div><div className="flex shrink-0 gap-1.5 text-[10px] text-moss"><span className="rounded-full bg-paper px-2 py-1">{project.sources} sources</span><span className="rounded-full bg-paper px-2 py-1">{project.open} open</span></div></div><p className="mt-4 max-w-[500px] text-xs leading-relaxed text-moss">{project.summary}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3"><span className="flex items-center gap-1.5 text-[11px] font-semibold"><ArrowUpRight size={14} className="text-moss" /> Next: {project.next}</span><span className="flex items-center gap-1 text-[10px] font-bold text-moss"><FileText size={12} /> Sources</span></div></button>;
}

function ActionView({ tasks, onCycle, onAdd, weeklyReview }: { tasks: Task[]; onCycle: (id: number) => void; onAdd: () => void; weeklyReview: WeeklyReview | null }) {
  const statuses: TaskStatus[] = ["suggested", "in-progress", "blocked", "done"];
  return <div className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="serif text-3xl">Your next few moves</h2><p className="mt-1 text-xs text-moss">Every task keeps its source, project, and explicit status.</p></div><div className="flex gap-2"><button className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-[11px] font-bold text-white"><Plus size={14} /> Add task</button></div></div>{weeklyReview?.suggestedNextActions.length ? <div className="mt-5 rounded-2xl border border-[#cddfc8] bg-[#f3f8f0] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]">From your Alike weekly review</div><div className="mt-2 flex flex-wrap gap-2">{weeklyReview.suggestedNextActions.map((action) => <span key={action.id} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink">{action.title}</span>)}</div><p className="mt-2 text-[10px] text-moss">These are suggestions only. Add one manually after review.</p></div> : null}<div className="mt-6 grid gap-3 lg:grid-cols-4">{statuses.map((status) => <div key={status} className="min-h-[270px] rounded-2xl border border-[var(--line)] bg-white/45 p-3"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-moss"><span className="h-2 w-2 rounded-full" style={{ background: statusMeta[status].color }} />{statusMeta[status].label}</div><span className="text-[10px] text-moss/50">{tasks.filter((task) => task.status === status).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} onCycle={() => onCycle(task.id)} />)}</div>{status === "suggested" && <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] py-2 text-[10px] font-bold text-moss/65 hover:bg-white"><Plus size={12} /> Add task</button>}</div>)}</div><div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#e4d8af] bg-[#fff8dc] px-4 py-3 text-xs text-[#786b36]"><Sparkles size={15} /><span><strong>1 possible duplicate</strong> found in your imported conversations.</span><button className="ml-auto font-bold underline">Review merge</button></div></div>;
}

function TaskCard({ task, onCycle }: { task: Task; onCycle: () => void }) {
  return <div className="rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm"><div className="flex items-start gap-2"><button onClick={onCycle} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${task.status === "done" ? "border-[#75aa80] bg-[#75aa80] text-white" : "border-moss/35 text-transparent hover:border-moss"}`}>{task.status === "done" ? <Check size={10} /> : <Circle size={8} fill="currentColor" />}</button><div className={`text-xs font-semibold leading-relaxed ${task.status === "done" ? "text-moss/45 line-through" : ""}`}>{task.title}</div></div><div className="mt-3 flex flex-wrap items-center gap-1.5 pl-6"><span className="rounded bg-[#edf5e9] px-1.5 py-1 text-[9px] font-bold text-[#54845e]">{task.project}</span>{task.priority && <span className={`rounded px-1.5 py-1 text-[9px] font-bold ${task.priority === "High" ? "bg-[#fff0ea] text-[#b7684d]" : "bg-paper text-moss"}`}>{task.priority}</span>}</div><div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 pl-6 text-[9px] text-moss/60"><span className="flex items-center gap-1">{task.source === "Dial capture" ? <Phone size={10} /> : <MessageCircle size={10} />}{task.source}</span>{task.due && <span className="flex items-center gap-1"><Clock3 size={10} />{task.due}</span>}</div></div>;
}
