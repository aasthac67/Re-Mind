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

## Dial Context MCP demo

Requires Node 22 or newer. Set DIAL_API_KEY, DIAL_NUMBER, REMIND_MCP_TOKEN (a random secret), and DIAL_ALLOWED_CALLERS (comma-separated E.164 numbers) in .env.local. Never commit that file.

Run npm run dev -- --hostname 127.0.0.1 on port 3000, then npm run dial:gateway. The gateway listens on 127.0.0.1:3001 and forwards only POST /api/dial/mcp. Tunnel port 3001, not port 3000. The dashboard and task REST endpoints are local only.

Connect the public HTTPS /api/dial/mcp URL to Dial Context MCPs with an Authorization: Bearer header containing REMIND_MCP_TOKEN. Configure the Dial number's inbound instructions to use list_tasks, get_project_context, create_task, and update_task_status. Require verbal confirmation for writes; confirm success only after the tool succeeds. Do not claim any booking or purchase was made.

Authentication is separate from authorization: tool discovery needs the bearer token; tool execution also requires inbound direction, the configured Dial agent number, and an allowlisted X-Dial-User-Number. Caller ID is suitable for this demo, not strong identity verification for sensitive production data.

Tasks are saved in .remind/state.json using serialized atomic writes. The dashboard polls every three seconds. Initial project context and tasks are seeded demo data. This file store supports a single local process only; use a shared database for deployment. Keep the app, gateway and tunnel running during calls. A temporary tunnel URL changes after restart, requiring reconnection in Dial.

Smoke test: from an allowed phone, call the Dial number; ask for the Seattle recap, then request a new task and confirm. The task should appear in Action Hub and survive a page reload. Unknown callers cannot retrieve or change records.

## Portable Dial setup

See [docs/DIAL_SETUP.md](docs/DIAL_SETUP.md). Run npm run dial:setup, edit .env.local, then npm run dial:dev. Register a teammate-provided public HTTPS MCP URL with npm run dial:connect -- --url https://YOUR_HOST/api/dial/mcp. No tunnel starts automatically. Tasks persist in the local JSON text file .remind/state.json.
