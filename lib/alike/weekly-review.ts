import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ReviewActivity, ReviewCategory, WeeklyReview } from "@/lib/weekly-review/types";

const execFileAsync = promisify(execFile);

export const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are Re:Mind's weekly-review assistant. Use only the supplied Alike evidence. Group activity into approved categories, surface explicit blockers and commitments, and suggest next actions. Never infer a task is complete unless an explicit status confirms it. Every summary item must retain its evidence reference. Return structured JSON only.`;

type AlikeBriefing = Record<string, unknown> & {
  found?: boolean;
  message?: string;
  ui_briefing_headline?: { summary_text?: string; headline?: string };
};

const categories: ReviewCategory[] = ["Work & Learning", "Personal / Admin", "Health & Workouts", "Trips & Hobbies"];

const kindLabels: Record<ReviewActivity["kind"], string> = {
  next_action: "Next action",
  blocker: "Blocked",
  commitment: "Commitment",
  update: "Update",
};

function dateKey(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function rangeLabel(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return `${formatter.format(new Date(`${start}T12:00:00`))} – ${formatter.format(new Date(`${end}T12:00:00`))}`;
}

function getAlikeCliPath() {
  if (process.env.ALIKE_CLI_PATH) return process.env.ALIKE_CLI_PATH;
  const homeDirectory = process.env.HOME;
  return homeDirectory ? `${homeDirectory}/.alike/bin/alike` : "alike";
}

async function fetchBriefing(date: string): Promise<AlikeBriefing | null> {
  try {
    const { stdout } = await execFileAsync(getAlikeCliPath(), ["call", "get_briefing", "--json", JSON.stringify({ date, depth: "thick" })], {
      timeout: 12_000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout) as AlikeBriefing;
  } catch {
    return null;
  }
}

function categoryFor(text: string): ReviewCategory {
  const normalized = text.toLowerCase();
  if (/(trip|travel|flight|hotel|rental|hike|vacation)/.test(normalized)) return "Trips & Hobbies";
  if (/(workout|run|gym|health|doctor|meditation)/.test(normalized)) return "Health & Workouts";
  if (/(invoice|tax|admin|appointment|renew|errand)/.test(normalized)) return "Personal / Admin";
  return "Work & Learning";
}

function projectFor(item: Record<string, unknown>, category: ReviewCategory, title: string) {
  for (const key of ["project_title", "project_name", "project"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object" && typeof (value as { name?: unknown }).name === "string") return (value as { name: string }).name;
  }

  if (category === "Trips & Hobbies") {
    const tripName = title
      .replace(/^(plan|book|research|organize|create|find|compare|prepare|review)\s+(?:a |an |the )?/i, "")
      .replace(/\s+(?:next|this)\s+week\b.*$/i, "")
      .replace(/\s+(?:focused on|including)\b.*$/i, "")
      .replace(/[.!?]+$/, "")
      .trim();
    if (tripName.length >= 4) return tripName;
  }

  return category === "Work & Learning" ? "Recent work" : category;
}

function asItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: unknown[] }).items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  return [];
}

function itemText(item: Record<string, unknown>) {
  for (const key of ["title", "name", "summary", "text", "reason", "description"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Alike activity needs review";
}

function itemDetail(item: Record<string, unknown>, kind: ReviewActivity["kind"], fallbackDetail?: string) {
  const explicitDetail = typeof item.detail === "string" ? item.detail : typeof item.reason === "string" ? item.reason : "";
  return explicitDetail || fallbackDetail || kindLabels[kind];
}

function valueAtPath(value: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function isFallbackRecommendation(briefing: AlikeBriefing) {
  const value = briefing.next_actions;
  return Boolean(value && typeof value === "object" && (value as { fallback?: unknown }).fallback === true);
}

function sourceRefFor(item: Record<string, unknown>, briefing: AlikeBriefing) {
  for (const key of ["urn", "entity_urn"]) {
    if (typeof item[key] === "string") return item[key] as string;
  }

  const matchingRecommendation = asItems(briefing.next_actions).find((candidate) => itemText(candidate) === itemText(item));
  return typeof matchingRecommendation?.entity_urn === "string" ? matchingRecommendation.entity_urn : undefined;
}

function activitiesFromBriefing(briefing: AlikeBriefing, date: string): ReviewActivity[] {
  const mapping: Array<{ path: string[]; kind: ReviewActivity["kind"]; fallbackDetail?: string }> = [
    { path: ["next_actions"], kind: "next_action" },
    { path: ["blockers"], kind: "blocker" },
    { path: ["commitments"], kind: "commitment" },
    { path: ["inferred_today"], kind: "update" },
    { path: ["plan", "deterministic_context", "task_graph", "in_progress"], kind: "next_action", fallbackDetail: "In progress" },
    { path: ["plan", "deterministic_context", "task_graph", "ready_to_start"], kind: "next_action", fallbackDetail: "Ready to start" },
    { path: ["plan", "deterministic_context", "task_graph", "at_risk"], kind: "blocker", fallbackDetail: "At risk" },
  ];

  return mapping.flatMap(({ path, kind, fallbackDetail }) => {
    // Alike may return a most-recent task when it has no genuine ranked signal.
    // That is a product fallback, not evidence from a conversation, so it must
    // never be displayed as recovered user context.
    if (path[0] === "next_actions" && isFallbackRecommendation(briefing)) return [];

    return asItems(valueAtPath(briefing, path)).map((item, index) => {
      const title = itemText(item);
      const detail = itemDetail(item, kind, fallbackDetail);
      const sourceRef = sourceRefFor(item, briefing);
      const category = categoryFor(`${title} ${detail}`);
      return {
        id: `${date}-${path.join("-")}-${sourceRef ?? index}`,
        title,
        detail,
        project: projectFor(item, category, title),
        category,
        kind,
        occurredOn: date,
        sourceLabel: `Alike daily briefing · ${date}`,
        sourceRef,
      };
    });
  });
}

function summaryFromBriefing(briefing: AlikeBriefing) {
  const planSummary = valueAtPath(briefing, ["plan", "synthesized_context", "summary"]);
  if (typeof planSummary === "string" && planSummary.trim()) return planSummary;
  return briefing.ui_briefing_headline?.summary_text ?? briefing.ui_briefing_headline?.headline;
}

function countsFor(activities: ReviewActivity[]) {
  return categories.reduce<Record<ReviewCategory, number>>((counts, category) => {
    counts[category] = activities.filter((activity) => activity.category === category).length;
    return counts;
  }, {} as Record<ReviewCategory, number>);
}

function emptyReview(start: string, end: string): WeeklyReview {
  return {
    period: { start, end, label: rangeLabel(start, end) },
    generatedAt: new Date().toISOString(),
    mode: "empty",
    connectionMessage: "No recent context is available yet.",
    summary: "Start or continue a coding-agent conversation, then refresh to bring its recent context into Re:Mind.",
    activities: [],
    suggestedNextActions: [],
    categoryCounts: countsFor([]),
    sourceCount: 0,
  };
}

export async function getWeeklyReview(): Promise<WeeklyReview> {
  const end = dateKey(0);
  const start = dateKey(6);
  const dates = Array.from({ length: 7 }, (_, index) => dateKey(index));
  const responses = await Promise.all(dates.map(async (date) => ({ date, briefing: await fetchBriefing(date) })));
  const found = responses.filter((response) => response.briefing?.found);
  const activities = found.flatMap(({ date, briefing }) => activitiesFromBriefing(briefing as AlikeBriefing, date));
  const summaries = found
    .map(({ briefing }) => summaryFromBriefing(briefing as AlikeBriefing))
    .filter((summary): summary is string => Boolean(summary));

  if (!found.length || !activities.length) return emptyReview(start, end);

  const uniqueActivities = Array.from(new Map(activities.map((activity) => [`${activity.kind}:${activity.title}`, activity])).values()).slice(0, 12);
  const suggestedNextActions = uniqueActivities.filter((activity) => activity.kind === "next_action").slice(0, 3);
  return {
    period: { start, end, label: rangeLabel(start, end) },
    generatedAt: new Date().toISOString(),
    mode: "live",
    connectionMessage: `Live Alike data from ${found.length} completed daily briefing${found.length === 1 ? "" : "s"}.`,
    summary: summaries[0] ?? `Alike found ${uniqueActivities.length} source-backed activity items from the previous seven days.`,
    activities: uniqueActivities,
    suggestedNextActions,
    categoryCounts: countsFor(uniqueActivities),
    sourceCount: uniqueActivities.filter((activity) => Boolean(activity.sourceRef)).length,
  };
}
