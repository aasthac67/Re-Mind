export type TaskStatus = "suggested" | "in-progress" | "blocked" | "done";

export type Task = {
  id: number;
  title: string;
  project: string;
  source?: string;
  status: TaskStatus;
  due?: string;
  priority?: "High" | "Medium";
};


export const projects = [
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

export const initialTasks: Task[] = [
  { id: 1, title: "Compare / book Seattle rental car", project: "Seattle Trip", source: "Dial capture", status: "suggested", due: "Next week", priority: "High" },
  { id: 2, title: "Confirm day-trip route", project: "Seattle Trip", source: "Travel chat · 2 sources", status: "in-progress", due: "Nov 18", priority: "Medium" },
  { id: 3, title: "Add expired-token test coverage", project: "Auth Project", source: "Codex session", status: "blocked", due: "Today", priority: "High" },
  { id: 4, title: "Outline weekend photo walk", project: "Personal", source: "Manual note", status: "done" },
];

