# Re:Mind

Re:Mind is a source-backed continuity layer for fragmented AI conversations. This branch contains the first dashboard design pass from the LifeMaxx / SpeedHacks 2026 product spec.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Included in this pass

- Context Hub and Action Hub tabs
- Seeded Seattle Trip and Auth Project context threads
- Source-backed context brief with decisions and next action
- Copyable context handoff
- Editable task board with Suggested, In progress, Blocked, and Done states
- Manual task capture modal
- Dial capture and duplicate-merge review affordances in the UI

The current data is intentionally local mock data. No connector or Dial integration is claimed to be live yet.
