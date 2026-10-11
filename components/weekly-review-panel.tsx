"use client";

import { AlertCircle, ArrowUpRight, CheckCircle2, CircleDashed, Database, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import type { ReviewActivity, WeeklyReview } from "@/lib/weekly-review/types";

type Props = {
  review: WeeklyReview | null;
  loading: boolean;
  onRefresh: () => void;
};

const kindStyle: Record<ReviewActivity["kind"], { label: string; className: string }> = {
  next_action: { label: "Suggested next", className: "bg-[#edf5e9] text-[#54845e]" },
  blocker: { label: "Blocked", className: "bg-[#fff0ea] text-[#b7684d]" },
  commitment: { label: "Commitment", className: "bg-[#edf1ff] text-[#5972ad]" },
  update: { label: "Update", className: "bg-paper text-moss" },
};

export function WeeklyReviewPanel({ review, loading, onRefresh }: Props) {
  if (loading && !review) {
    return <div className="mt-7 rounded-3xl border border-[var(--line)] bg-white/70 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-moss"><LoaderCircle size={15} className="animate-spin" /> Building your Alike weekly review…</div><div className="mt-4 h-16 animate-pulse rounded-2xl bg-paper" /></div>;
  }

  if (!review) {
    return <div className="mt-7 flex items-start gap-3 rounded-3xl border border-[#ead5ca] bg-[#fff7f1] p-5 text-sm text-[#8f5d49]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><strong>Weekly review unavailable.</strong><p className="mt-1 text-xs">The dashboard is still available. Refresh to try the local Alike connection again.</p><button onClick={onRefresh} className="mt-3 text-xs font-bold underline">Try again</button></div></div>;
  }

  return <section className="mt-7 overflow-hidden rounded-3xl border border-[var(--line)] bg-white/75">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
      <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-moss"><Sparkles size={13} /> Alike weekly review</div><h2 className="serif mt-2 text-3xl">Your last seven days</h2><p className="mt-1 text-xs text-moss">{review.period.label} · source-backed and read-only</p></div>
      <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${review.mode === "live" ? "bg-[#e6f3e5] text-[#4e8d62]" : "bg-[#fff4d9] text-[#8b6d2d]"}`}>{review.mode === "live" ? "ALike live" : "Demo fallback"}</span><button onClick={onRefresh} className="rounded-xl border border-[var(--line)] bg-white p-2 text-moss hover:bg-paper" aria-label="Refresh weekly review"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></div>
    </div>
    <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_.9fr]"><div><p className="max-w-2xl text-sm leading-relaxed text-moss">{review.summary}</p><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(review.categoryCounts).map(([category, count]) => <div key={category} className="rounded-2xl bg-paper px-3 py-3"><div className="text-lg font-bold">{count}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[0.11em] text-moss/65">{category}</div></div>)}</div><div className="mt-4 flex items-center gap-2 text-[10px] text-moss/65"><ShieldCheck size={13} className="text-[#54845e]" /> {review.connectionMessage}</div></div>
      <div className="rounded-2xl bg-[#f3f7f0] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#54845e]"><CheckCircle2 size={13} /> Suggested next actions</div><span className="text-[10px] text-moss/60">Review before creating</span></div><div className="mt-3 space-y-2">{review.suggestedNextActions.length ? review.suggestedNextActions.map((activity) => <ReviewRow key={activity.id} activity={activity} />) : <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-xs text-moss"><CircleDashed size={14} /> No source-backed actions need review.</div>}</div></div></div>
    <div className="border-t border-[var(--line)] bg-white/40 px-5 py-4"><div className="mb-3 flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-moss">Evidence from Alike</div><div className="flex items-center gap-1 text-[10px] text-moss/60"><Database size={12} /> {review.sourceCount} direct source references</div></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{review.activities.slice(0, 6).map((activity) => <ReviewRow key={activity.id} activity={activity} compact />)}</div></div>
  </section>;
}

function ReviewRow({ activity, compact = false }: { activity: ReviewActivity; compact?: boolean }) {
  const style = kindStyle[activity.kind];
  return <div className={`rounded-xl border border-white bg-white/80 ${compact ? "p-3" : "p-3.5"}`} title={activity.sourceRef ?? activity.sourceLabel}><div className="flex items-start justify-between gap-2"><div className="text-xs font-semibold leading-relaxed text-ink">{activity.title}</div><span className={`shrink-0 rounded px-1.5 py-1 text-[9px] font-bold ${style.className}`}>{style.label}</span></div><div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-moss/70"><span>{activity.category}</span><span>·</span><span>{activity.sourceLabel}</span>{activity.sourceRef && <span className="flex items-center gap-0.5 font-semibold text-[#54845e]"><ArrowUpRight size={11} /> linked</span>}</div>{!compact && <p className="mt-2 text-[11px] leading-relaxed text-moss">{activity.detail}</p>}</div>;
}
