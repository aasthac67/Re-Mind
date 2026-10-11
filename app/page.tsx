"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Copy,
  FileText,
  Filter,
  Inbox,
  Link2,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { initialTasks, projects, type Project, type Task, type TaskStatus } from "@/lib/workspace";



type Hub = "context" | "action";
const REMIND_PHONE = "+19896018765";
const REMIND_PHONE_LABEL = "+1 (989) 601-8765";

type ContextProjectOption = { id: string; name: string };
type AgentSuggestion = { matchedProjectId: string; confidence: number; reason: string; suggestedPrompt: string };


const categories = [
  { label: "Trips & Hobbies", count: 1, color: "#f4a07a" },
  { label: "Health & Workouts", count: 0, color: "#c9e8c4" },
  { label: "Work & Learning", count: 1, color: "#aebce9" },
  { label: "Personal / Admin", count: 0, color: "#ead58c" },
];

const statusMeta: Record<TaskStatus, { label: string; color: string }> = {
  suggested: { label: "To-do", color: "#e6b45f" },
  "in-progress": { label: "In progress", color: "#89a8e9" },
  blocked: { label: "Blocked", color: "#e88772" },
  done: { label: "Done", color: "#75aa80" },
};

export default function Home() {
  const callDialog = useRef<HTMLDialogElement>(null);
  const [hub, setHub] = useState<Hub>("context");
  const [selectedProject, setSelectedProject] = useState("seattle");
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [toast, setToast] = useState("");
  const [promptTask, setPromptTask] = useState<Task | null>(null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestion | null>(null);
  const [contextProjects, setContextProjects] = useState<ContextProjectOption[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [promptError, setPromptError] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const response = await fetch('/api/tasks', { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); if (active) setTasks(data.tasks); }
      catch { if (active) setToast('Unable to sync tasks. Check the app connection.'); }
    };
    void refresh(); const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const selected = projects.find((project) => project.id === selectedProject) ?? projects[0];
  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((task) => `${task.title} ${task.project} ${task.source}`.toLowerCase().includes(term));
  }, [search, tasks]);

  async function moveTask(id: number, status: TaskStatus) {
    try {
      const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (!response.ok) throw new Error(); const { task: saved } = await response.json();
      setTasks(current => current.map(t => t.id === id ? saved : t));
    } catch { setToast('Task update failed. Please try again.'); }
  }

  async function cycleTask(id: number) {
    const order: TaskStatus[] = ['suggested', 'in-progress', 'blocked', 'done'];
    const task = tasks.find(t => t.id === id); if (!task) return;
    await moveTask(id, order[(order.indexOf(task.status) + 1) % order.length]);
  }

  async function addTask() {
    if (!newTask.trim()) return;
    try {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTask.trim(), project: selected.name, requestId: crypto.randomUUID() }) });
      if (!response.ok) throw new Error(); const { task } = await response.json();
      setTasks(current => [task, ...current.filter(t => t.id !== task.id)]);
      setNewTask(''); setShowAdd(false); setToast('Task saved to To-do');
      window.setTimeout(() => setToast(''), 2500);
    } catch { setToast('Task could not be saved. Please try again.'); }

  }

  function copyContext() {
    const context = `${selected.name}\n${selected.summary}\nNext action: ${selected.next}`;
    navigator.clipboard?.writeText(context);
    setToast("Context brief copied");
    window.setTimeout(() => setToast(""), 2500);
  }

  function copyPrompt(prompt: string) {
    navigator.clipboard?.writeText(prompt);
    setToast("Agent prompt copied");
    window.setTimeout(() => setToast(""), 2500);
  }

  async function generatePrompt(task: Task, selectedProjectId?: string) {
    setPromptTask(task);
    setAgentPrompt("");
    setAgentSuggestion(null);
    if (!selectedProjectId) setContextProjects([]);
    setPromptError("");
    setIsGeneratingPrompt(true);

    try {
      const response = await fetch("/api/agent-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, selectedProjectId }),
      });
      const result = await response.json() as { suggestion?: AgentSuggestion; projects?: ContextProjectOption[]; error?: string };
      if (!response.ok || !result.suggestion) throw new Error(result.error ?? "Could not generate a handoff prompt.");
      setAgentSuggestion(result.suggestion);
      setAgentPrompt(result.suggestion.suggestedPrompt);
      setContextProjects(result.projects ?? []);
      setSelectedMatchId(result.suggestion.matchedProjectId === "unassigned" ? "" : result.suggestion.matchedProjectId);
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "Could not generate a handoff prompt.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  }

  return (
    <main className="min-h-screen px-3 py-3 text-ink sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1800px] gap-4">
        <aside className="hidden w-[238px] shrink-0 flex-col rounded-[26px] bg-ink p-5 text-white shadow-soft lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-ink"><Sparkles size={18} /></div>
            <div><div className="serif text-xl leading-none">Re:Mind</div><div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/50">Continuity layer</div></div>
          </div>
          <div className="mt-11 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your workspace</div>
          <nav className="mt-3 space-y-1">
            <SideNav icon={<Inbox size={16} />} label="All projects" active={hub === "context"} onClick={() => setHub("context")} />
            <SideNav icon={<Check size={16} />} label="Action Hub" active={hub === "action"} onClick={() => setHub("action")} badge={String(tasks.filter(t => t.status !== "done").length)} />
            <SideNav icon={<FileText size={16} />} label="Sources" onClick={() => { setHub("context"); window.setTimeout(() => document.getElementById("context-sources-button")?.click(), 0); }} />
          </nav>
          <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Categories</div>
          <div className="mt-3 space-y-1">
            {categories.map((category) => <div key={category.label} className="flex items-center justify-between rounded-xl px-2 py-2 text-xs text-white/65"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: category.color }} />{category.label}</span><span className="text-white/35">{category.count}</span></div>)}
          </div>
          <button onClick={() => callDialog.current?.showModal()} className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint"><span className="flex items-center gap-2 text-xs font-semibold"><Phone size={14} className="text-mint" /> Call Re:Mind</span><span className="mt-2 block text-[11px] leading-relaxed text-white/45">Capture a task or ask where you left off.</span><span className="mt-3 flex items-center gap-1 text-[11px] font-bold text-mint">View number <ArrowUpRight size={12} /></span></button>
        </aside>

        <section className="grain min-w-0 flex-1 rounded-[26px] border border-white/70 bg-white/55 shadow-soft backdrop-blur-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-mint"><Sparkles size={18} /></div><span className="serif text-xl">Re:Mind</span></div>
            <div className="relative order-3 w-full sm:order-none sm:max-w-[310px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss/60" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, tasks, sources..." className="h-10 w-full rounded-xl border border-[var(--line)] bg-white/70 pl-9 pr-3 text-xs outline-none placeholder:text-moss/60 focus:border-moss" /></div>
            <div className="flex items-center gap-3"><button onClick={() => callDialog.current?.showModal()} aria-label="Call Re:Mind" className="rounded-xl p-2 text-moss hover:bg-white lg:hidden"><Phone size={17} /></button><button className="relative rounded-xl p-2 text-moss hover:bg-white"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" /></button><div className="h-8 w-px bg-[var(--line)]" /><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6b894] text-xs font-bold">VK</div><span className="hidden text-xs font-semibold sm:block">Vikram</span><ChevronDown size={14} className="text-moss/60" /></div></div>
          </header>

          <div className="px-4 pb-6 pt-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> Your continuity layer is clear</div><h1 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">Less remembering. <span className="text-moss">More doing.</span></h1><p className="mt-2 max-w-[540px] text-xs leading-relaxed text-moss">Re:Mind keeps the thread between your conversations, decisions, and the next small thing worth doing.</p></div><div className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2 text-left sm:text-right"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss">This week</div><div className="mt-1 text-base font-semibold">3<span className="ml-1 text-sm font-normal text-moss">threads moved forward</span></div><div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#4e8d62]"><ArrowUpRight size={13} /> 18 min saved</div></div></div>

            <div className="mt-5 flex items-center justify-between gap-3 border-b border-[var(--line)]"><div className="flex min-w-0 gap-4 sm:gap-6"><HubTab active={hub === "context"} onClick={() => setHub("context")} label="Context Hub" caption="Where did I leave off?" /><HubTab active={hub === "action"} onClick={() => setHub("action")} label="Action Hub" caption="What should I do next?" /></div><div className="hidden items-center gap-2 pb-3 text-[11px] text-moss sm:flex"><span className="h-2 w-2 rounded-full bg-[#74aa7e]" /> Tasks refresh every 3s</div></div>

            {hub === "context" ? <ContextView selected={selected} selectedProject={selectedProject} setSelectedProject={setSelectedProject} onCopy={copyContext} /> : <ActionView tasks={visibleTasks} onCycle={cycleTask} onMove={moveTask} onAdd={() => setShowAdd(true)} onContinue={generatePrompt} />}
          </div>
        </section>
      </div>

      <dialog ref={callDialog} aria-labelledby="call-remind-title" className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--line)] bg-white p-6 text-ink shadow-xl backdrop:bg-ink/30 backdrop:backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3"><h2 id="call-remind-title" className="text-lg font-semibold">Call Re:Mind</h2><button onClick={() => callDialog.current?.close()} aria-label="Close call dialog" className="rounded-lg p-2 text-moss hover:bg-paper"><X size={18} /></button></div>
        <p className="mt-3 text-sm leading-relaxed text-moss">Call this number from your phone to talk to Re:Mind.</p>
        <p className="mt-5 select-all text-xl font-semibold tracking-tight">{REMIND_PHONE_LABEL}</p>
        <a href={`tel:${REMIND_PHONE}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"><Phone size={16} /> Call now</a>
        <p className="mt-3 text-xs leading-relaxed text-moss">Opens your device’s calling app. You can also dial the number manually.</p>
      </dialog>

      {showAdd && <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-moss">Manual capture</div><h2 className="serif mt-2 text-3xl">What needs doing?</h2></div><button onClick={() => setShowAdd(false)} className="rounded-full p-2 text-moss hover:bg-paper"><X size={18} /></button></div><input autoFocus value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Send itinerary to Maya" className="mt-6 h-12 w-full rounded-xl border border-[var(--line)] bg-paper px-4 text-sm outline-none focus:border-moss" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-moss">Cancel</button><button onClick={addTask} className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white">Add to Action Hub</button></div></div></div>}
      {promptTask && <AgentPromptModal task={promptTask} prompt={agentPrompt} suggestion={agentSuggestion} projects={contextProjects} selectedProjectId={selectedMatchId} error={promptError} loading={isGeneratingPrompt} onChooseProject={setSelectedMatchId} onRegenerate={() => generatePrompt(promptTask, selectedMatchId)} onClose={() => setPromptTask(null)} onCopy={copyPrompt} />}
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

function ContextView({ selected, selectedProject, setSelectedProject, onCopy }: { selected: (typeof projects)[number]; selectedProject: string; setSelectedProject: (id: string) => void; onCopy: () => void }) {
  const sourcesDialog = useRef<HTMLDialogElement>(null);
  const [sourceProject, setSourceProject] = useState(selected);
  function openSources(project: Project) { setSourceProject(project); sourcesDialog.current?.showModal(); }
  const sources = [
    { provider: "Codex", id: "019b734e-5d26-7a91-b230-86ad491de602", title: sourceProject.id === "seattle" ? "Seattle day-trip planning" : "Auth endpoint implementation", url: "https://chatgpt.com/codex" },
    { provider: "Claude", id: "7ed341b8-263a-4f5c-a902-68bc1d372e40", title: "Decisions and next steps", url: "https://claude.ai/" },
    { provider: "Gemini", id: "c1e79a04d2685bf3", title: "Options and research", url: "https://gemini.google.com/" },
  ];

  return <><dialog ref={sourcesDialog} aria-labelledby="sources-title" className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 text-ink shadow-xl backdrop:bg-ink/30 backdrop:backdrop-blur-sm"><div className="flex items-start justify-between gap-3"><div><h2 id="sources-title" className="text-lg font-semibold">Sources</h2><p className="mt-1 text-xs text-moss">{sourceProject.name}</p></div><button onClick={() => sourcesDialog.current?.close()} aria-label="Close sources" className="rounded-lg p-2 text-moss hover:bg-paper"><X size={18} /></button></div><div className="mt-4 space-y-2">{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[var(--line)] p-3 transition hover:bg-paper"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{source.provider}</span><ArrowUpRight size={15} className="text-moss" /></div><p className="mt-1 text-xs text-moss">{source.title}</p><p className="mt-2 break-all font-mono text-[10px] text-moss/70">Chat ID: {source.id}</p></a>)}</div></dialog><div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Living project threads <span className="ml-1 text-moss/40">2</span></h2><button className="flex items-center gap-1 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button></div><div className="space-y-3">{projects.map((project) => <ProjectCard key={project.id} project={project} active={selectedProject === project.id} onClick={() => setSelectedProject(project.id)} onSources={() => openSources(project)} />)}</div><button className="dashed mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white/40 py-4 text-xs font-bold text-moss hover:bg-white"><Plus size={15} /> Import another conversation</button></div><div className="rounded-3xl border border-[var(--line)] bg-white/75 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className="h-2 w-2 rounded-full bg-[#7eae84]" /> Context brief</div><button onClick={onCopy} className="rounded-lg p-1.5 text-moss hover:bg-paper" title="Copy context"><Copy size={15} /></button></div><h2 className="mt-4 text-xl font-semibold leading-snug">{selected.name}</h2><p className="mt-3 text-sm leading-relaxed text-moss">{selected.summary}</p><div className="mt-5 border-t border-[var(--line)] pt-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-moss/60">Decisions kept</div><ul className="mt-3 space-y-2">{selected.decisions.map((decision) => <li key={decision} className="flex gap-2 text-xs"><Check size={14} className="mt-0.5 shrink-0 text-[#5e9b6c]" />{decision}</li>)}</ul></div><div className="mt-5 rounded-2xl bg-[#edf5e9] p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]"><Sparkles size={13} /> Next action</div><div className="mt-2 text-sm font-bold">{selected.next}</div><button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#54845e]">Open in Action Hub <ArrowUpRight size={12} /></button></div><div className="mt-5 flex items-center justify-between text-[10px] text-moss/65"><button id="context-sources-button" onClick={() => openSources(selected)} className="flex items-center gap-1 font-semibold hover:underline"><Link2 size={12} /> View sources</button><button className="font-bold text-moss">View timeline</button></div></div></div></>;

}

function ProjectCard({ project, active, onClick, onSources }: { project: Project; active: boolean; onClick: () => void; onSources: () => void }) {
  const orange = project.tone === "orange";
  return <div className="relative"><button onClick={onClick} className={`w-full rounded-3xl border p-5 text-left transition ${active ? "border-ink/20 bg-white shadow-soft" : "border-[var(--line)] bg-white/55 hover:border-moss/40 hover:bg-white"}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-moss"><span className={`h-2.5 w-2.5 rounded-full ${orange ? "bg-coral" : "bg-[#9bb0e6]"}`} />{project.category}</div><MoreHorizontal size={17} className="text-moss/45" /></div><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold leading-snug">{project.name}</h3><p className="mt-2 text-[11px] text-moss/65">{project.kicker}</p></div><div className="flex shrink-0 gap-1.5 text-[10px] text-moss"><span className="rounded-full bg-paper px-2 py-1">{project.sources} sources</span><span className="rounded-full bg-paper px-2 py-1">{project.open} open</span></div></div><p className="mt-4 max-w-[500px] text-xs leading-relaxed text-moss">{project.summary}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3"><span className="flex items-center gap-1.5 text-[11px] font-semibold"><ArrowUpRight size={14} className="text-moss" /> Next: {project.next}</span><span className="w-16" aria-hidden="true" /></div></button><button onClick={onSources} aria-label={`View sources for ${project.name}`} className="absolute bottom-5 right-5 flex items-center gap-1 rounded p-1 text-[10px] font-bold text-moss hover:bg-paper"><FileText size={12} /> Sources</button></div>;
}

function ActionView({ tasks, onCycle, onMove, onAdd, onContinue }: { tasks: Task[]; onCycle: (id: number) => void; onMove: (id: number, status: TaskStatus) => void; onAdd: () => void; onContinue: (task: Task) => void }) {
  const statuses: TaskStatus[] = ["suggested", "in-progress", "blocked", "done"];
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null);
  return <div className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Your next few moves</h2><p className="mt-1 text-xs text-moss">Drag a task between columns to update its status.</p></div><div className="flex gap-2"><button className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-[11px] font-bold text-moss"><Filter size={13} /> Filter</button><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-[11px] font-bold text-white"><Plus size={14} /> Add task</button></div></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">{statuses.map((status) => <div key={status} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropStatus(status); }} onDragLeave={() => setDropStatus((current) => current === status ? null : current)} onDrop={(event) => { event.preventDefault(); const id = draggingTaskId ?? Number(event.dataTransfer.getData("text/plain")); if (id) onMove(id, status); setDraggingTaskId(null); setDropStatus(null); }} className={`min-w-0 rounded-2xl sm:min-h-[200px] border p-3 transition ${dropStatus === status ? "border-moss bg-[#edf5e9]" : "border-[var(--line)] bg-white/45"}`}><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-moss"><span className="h-2 w-2 rounded-full" style={{ background: statusMeta[status].color }} />{statusMeta[status].label}</div><span className="text-[10px] text-moss/50">{tasks.filter((task) => task.status === status).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} onCycle={() => onCycle(task.id)} onContinue={() => onContinue(task)} onDragStart={() => setDraggingTaskId(task.id)} onDragEnd={() => { setDraggingTaskId(null); setDropStatus(null); }} />)}</div>{status === "suggested" && <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] py-2 text-[10px] font-bold text-moss/65 hover:bg-white"><Plus size={12} /> Add task</button>}</div>)}</div></div>;

}

function TaskCard({ task, onCycle, onContinue, onDragStart, onDragEnd }: { task: Task; onCycle: () => void; onContinue: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  return <div draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(task.id)); onDragStart(); }} onDragEnd={onDragEnd} className="cursor-grab rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"><div className="flex items-start gap-2"><button onClick={onCycle} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${task.status === "done" ? "border-[#75aa80] bg-[#75aa80] text-white" : "border-moss/35 text-transparent hover:border-moss"}`}>{task.status === "done" ? <Check size={10} /> : <Circle size={8} fill="currentColor" />}</button><div className={`text-xs font-semibold leading-relaxed ${task.status === "done" ? "text-moss/45 line-through" : ""}`}>{task.title}</div></div><div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 pl-6 text-[9px] text-moss/60"><span className="flex items-center gap-1">{task.source === "Dial capture" ? <Phone size={10} /> : <MessageCircle size={10} />}{task.source}</span>{task.due && <span className="flex items-center gap-1"><Clock3 size={10} />{task.due}</span>}</div><button onClick={onContinue} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#edf5e9] px-2 py-2 text-[10px] font-bold text-[#54845e] transition hover:bg-[#dcecd7]"><Sparkles size={12} /> Ask Re:Mind for prompt</button></div>;
}

function AgentPromptModal({ task, prompt, suggestion, projects: projectOptions, selectedProjectId, error, loading, onChooseProject, onRegenerate, onClose, onCopy }: { task: Task; prompt: string; suggestion: AgentSuggestion | null; projects: ContextProjectOption[]; selectedProjectId: string; error: string; loading: boolean; onChooseProject: (id: string) => void; onRegenerate: () => void; onClose: () => void; onCopy: (prompt: string) => void }) {
  const matchedProject = projectOptions.find((project) => project.id === suggestion?.matchedProjectId);
  const confidence = suggestion ? `${Math.round(suggestion.confidence * 100)}% confidence` : "";
  const codexLink = `codex://new?prompt=${encodeURIComponent(prompt)}`;
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#54845e]"><Sparkles size={13} /> Agent-ready handoff</div><h2 className="serif mt-2 text-3xl leading-none">Continue this task anywhere</h2><p className="mt-2 text-xs leading-relaxed text-moss">Re:Mind fetched the latest Context Hub snapshot and asked Codex to find the best context.</p></div><button onClick={onClose} className="rounded-full p-2 text-moss hover:bg-paper" aria-label="Close prompt"><X size={18} /></button></div>{loading && <div className="mt-5 flex min-h-40 items-center justify-center rounded-2xl border border-[var(--line)] bg-paper text-xs font-semibold text-moss"><Sparkles size={15} className="mr-2 animate-pulse" /> Reading context and preparing your handoff…</div>}{error && <div className="mt-5 rounded-2xl border border-[#f2c7b8] bg-[#fff2ed] p-4 text-xs leading-relaxed text-[#a5553d]">{error}</div>}{suggestion && <><div className="mt-5 rounded-2xl border border-[#d8ead5] bg-[#f2f9ef] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#54845e]">Suggested context</div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#54845e]">{confidence}</span></div><div className="mt-2 text-sm font-bold">{matchedProject?.name ?? "No confident project match"}</div><p className="mt-1 text-xs leading-relaxed text-[#54845e]">{suggestion.reason}</p><div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-moss">Correct it</label><select value={selectedProjectId} onChange={(event) => onChooseProject(event.target.value)} className="h-8 rounded-lg border border-[#c9dfc5] bg-white px-2 text-xs text-ink outline-none focus:border-moss"><option value="">Choose a Context Hub project</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button onClick={onRegenerate} disabled={!selectedProjectId} className="rounded-lg border border-[#c9dfc5] bg-white px-3 py-1.5 text-[10px] font-bold text-[#54845e] disabled:cursor-not-allowed disabled:opacity-45">Use selected context</button></div></div><pre className="mt-4 max-h-[300px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-paper p-4 font-sans text-xs leading-relaxed text-ink">{prompt}</pre></>}<div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] text-moss/65">Only the generated handoff is copied; original sources stay in Context Hub.</span><div className="flex gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-moss">Close</button>{prompt && <><a href={codexLink} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-xs font-bold text-moss hover:bg-paper"><ArrowUpRight size={14} /> Open in Codex</a><button onClick={() => onCopy(prompt)} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white"><Copy size={14} /> Copy prompt</button></>}</div></div></div></div>;

}
