# Re:Mind

Re:Mind is a source-backed continuity layer for fragmented AI conversations. This branch contains the first dashboard design pass from the LifeMaxx / SpeedHacks 2026 product spec.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Alike weekly review

The homepage now requests recent context on app load and turns it into Re:Mind project threads and task suggestions.

1. Install and sign in to Alike on this machine.
2. Make sure its local CLI is available at `~/.alike/bin/alike`, or copy `.env.example` to `.env.local` and set `ALIKE_CLI_PATH`.
3. Run Re:Mind locally with `npm run dev`.

Re:Mind asks Alike for today's briefing plus the prior six days, then maps explicit next actions, blockers, commitments, and updates into the homepage. This allows a newly captured coding-agent chat to appear after a browser refresh.

The context read is the only integration visible to the product code; Alike is not shown as a homepage feature. Its data is kept server-side, and the browser receives only Re:Mind project and task fields. If no recent context is available, Re:Mind shows an empty state rather than fabricated project data.

`lib/alike/weekly-review.ts` contains the evidence-first context adapter and the system prompt for a future model-powered formatter. The current implementation uses deterministic categorization so it runs locally without an additional model API key.

## Included in this pass

- Context Hub and Action Hub tabs
- Seeded Seattle Trip and Auth Project context threads
- Source-backed context brief with decisions and next action
- Copyable context handoff
- Editable task board with Suggested, In progress, Blocked, and Done states
- Manual task capture modal
- Dial capture and duplicate-merge review affordances in the UI
- A local history-backed homepage that replaces mock projects and tasks after refresh

The current data is intentionally local mock data. No connector or Dial integration is claimed to be live yet.
