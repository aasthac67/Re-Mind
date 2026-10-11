# Re:Mind

Re:Mind is a source-backed continuity layer for fragmented AI conversations. This branch contains the first dashboard design pass from the LifeMaxx / SpeedHacks 2026 product spec.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Alike weekly review

The Context Hub now requests a read-only weekly review on app load.

1. Install and sign in to Alike on this machine.
2. Make sure its local CLI is available at `~/.alike/bin/alike`, or copy `.env.example` to `.env.local` and set `ALIKE_CLI_PATH`.
3. Run Re:Mind locally with `npm run dev`.

Re:Mind asks Alike for the seven **completed** daily briefings, then maps explicit next actions, blockers, commitments, and updates into a weekly review. It does not request today's briefing because Alike may create a new daily plan when none exists.

The weekly review is read-only. Alike data is kept server-side; the browser receives only the rendered review fields and source references. If no completed Alike briefings are available, the UI shows a clearly marked demo fallback instead of implying live data.

`lib/alike/weekly-review.ts` contains the evidence-first review adapter and the system prompt for a future model-powered summarizer. The current implementation uses deterministic categorization so it runs locally without an additional model API key.

## Included in this pass

- Context Hub and Action Hub tabs
- Seeded Seattle Trip and Auth Project context threads
- Source-backed context brief with decisions and next action
- Copyable context handoff
- Editable task board with Suggested, In progress, Blocked, and Done states
- Manual task capture modal
- Dial capture and duplicate-merge review affordances in the UI
- A local Alike-backed “Your last seven days” review with evidence labels and refresh

The current data is intentionally local mock data. No connector or Dial integration is claimed to be live yet.
