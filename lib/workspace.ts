export type TaskStatus = "suggested" | "in-progress" | "blocked" | "done";

export type TimelineEvent = {
  label: string;
  occurredAt: string;
};

export type Project = {
  id: string;
  category: string;
  name: string;
  kicker: string;
  sources: number;
  open: number;
  summary: string;
  decisions: string[];
  next: string;
  tone: "orange" | "blue";
  timeline?: TimelineEvent[];
};

export type Task = {
  id: number;
  title: string;
  project: string;
  source?: string;
  status: TaskStatus;
  due?: string;
  priority?: "High" | "Medium";
};

// This is the only temporary part of the repository. The API below is already
// shaped like a data-access layer, so this module can be replaced by Supabase
// queries without changing the route or the browser contract.
export const projects: Project[] = [
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
    timeline: [
      { label: "Day trip chosen", occurredAt: "Nov 10" },
      { label: "Itinerary drafted", occurredAt: "Nov 11" },
      { label: "Rental decision opened", occurredAt: "Nov 12" },
    ],
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

export const initialTasks: Task[] = [
  { id: 1, title: "Compare / book Seattle rental car", project: "Seattle Trip", source: "Dial capture", status: "suggested", due: "Next week", priority: "High" },
  { id: 2, title: "Confirm day-trip route", project: "Seattle Trip", source: "Travel chat · 2 sources", status: "in-progress", due: "Nov 18", priority: "Medium" },
  { id: 3, title: "Add expired-token test coverage", project: "Auth Project", source: "Codex session", status: "blocked", due: "Today", priority: "High" },
  { id: 4, title: "Outline weekend photo walk", project: "Personal", source: "Manual note", status: "done" },
];

export function getTaskContext(taskId: number) {
  const task = initialTasks.find((item) => item.id === taskId);
  if (!task) return null;

  return {
    task,
    project: projects.find((item) => item.name === task.project) ?? null,
  };
}
