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

## Task handoff flow

Action Hub can ask Codex CLI to match a task to the latest Context Hub project
data and create a portable continuation prompt. For the demo, `GET
/api/context-hub` supplies the temporary Context Hub snapshot. When the live
Context Hub service is ready, set `CONTEXT_HUB_API_URL` to its project endpoint;
the Action Hub backend will fetch it instead.

The local server must have the Codex CLI installed and authenticated. Set
`CODEX_CLI_PATH` only if the `codex` command is not already on `PATH`.

The current data is intentionally local mock data. No connector or Dial integration is claimed to be live yet.
