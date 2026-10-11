export type ReviewMode = "live" | "empty";

export type ReviewCategory = "Work & Learning" | "Personal / Admin" | "Health & Workouts" | "Trips & Hobbies";

export type ReviewActivity = {
  id: string;
  title: string;
  detail: string;
  project: string;
  category: ReviewCategory;
  kind: "next_action" | "blocker" | "commitment" | "update";
  occurredOn: string;
  sourceLabel: string;
  sourceRef?: string;
};

export type WeeklyReview = {
  period: { start: string; end: string; label: string };
  generatedAt: string;
  mode: ReviewMode;
  connectionMessage: string;
  summary: string;
  activities: ReviewActivity[];
  suggestedNextActions: ReviewActivity[];
  categoryCounts: Record<ReviewCategory, number>;
  sourceCount: number;
};
