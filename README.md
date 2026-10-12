# Re:Mind

Re:Mind is a local-first continuity workspace for work that gets scattered across AI conversations. It turns a project recap and its next action into a small, usable dashboard: **what was decided, what is active, and what to do next**.

> This repository is a working product demo for the LifeMaxx / SpeedHacks 2026 concept. Its Context Hub currently uses seeded local project data; it is designed so a live context service can replace that fixture without changing the dashboard.

## The problem

Conversations with coding agents often contain the important details of a project—decisions, blockers, unfinished tasks, and the exact point where work stopped. That context is hard to recover when starting a new session or handing the work to another agent. A task list alone loses the reasoning; a transcript alone does not make the next action clear.

## The solution

Re:Mind combines the two views needed to resume work confidently:

- **Context Hub** presents each project as a compact brief with its summary, decisions, sources, timeline, and recommended next action.
- **Action Hub** turns that context into a local task board. Tasks can be captured manually, moved through their status, and handed to an agent with a tailored continuation prompt.
- **Dial Context MCP** is an optional voice-facing interface for reading project context and creating or updating tasks after explicit confirmation.

The goal is not to claim that an agent automatically knows every past conversation. Instead, Re:Mind gives downstream agents a bounded, portable context package and makes the handoff visible to the person doing the work.

## How it works today

```text
Context source (fixture now, service later)
                 |
                 v
        Context Hub project brief
                 |
                 +----------------------------+
                 |                            |
                 v                            v
        Action Hub task board          Codex continuation prompt
        (.remind/state.json)           (read-only, ephemeral CLI run)
                 ^
                 |
     Optional Dial Context MCP tools
```

### 1. Context arrives through one replaceable endpoint

The dashboard starts with the local project fixture in `lib/workspace.ts`. The server also exposes that same shape at `GET /api/context-hub`. To connect a real context system, set `CONTEXT_HUB_API_URL` to a compatible project endpoint; the handoff route will use it instead of the fixture.

Each project supplies the information the UI needs: a name, short summary, decisions, next action, sources, timeline, and last-updated time. This keeps the front end independent of where the context was collected.

### 2. Tasks stay local and actionable

The Action Hub reads and writes tasks through `/api/tasks`. Its local store persists to `.remind/state.json` using serialized, atomic writes, so captured tasks survive a page refresh. The dashboard polls for changes every three seconds and supports manual capture, status changes, and drag-and-drop updates.

This file-backed store is intentionally for one local process. A deployed, multi-user version should replace it with a shared data store.

### 3. Handoffs are generated from bounded context

When you choose **Ask Re:Mind for prompt**, the browser sends the selected task to `/api/agent-prompt`. On the server, Re:Mind retrieves the current project context, asks the locally installed Codex CLI to match the task to a project, and returns structured JSON containing a suggested continuation prompt. You can then open that prompt through the `codex://new` deep link or copy it elsewhere.

The CLI execution is ephemeral and read-only. It receives only the task and the supplied Context Hub data—not implicit access to chats, repositories, local files, or the internet. Set `CODEX_CLI_PATH` if `codex` is not on your `PATH`.

### 4. Dial is an optional, narrowly scoped input channel

The local MCP endpoint at `/api/dial/mcp` exposes four tools:

- `list_tasks`
- `get_project_context`
- `create_task`
- `update_task_status`

Writes require `confirmed: true`. Tool calls also require a bearer token, an inbound call to the configured Dial number, and an allowlisted caller number. The included gateway only forwards `POST /api/dial/mcp` from port 3001 to the local Next.js app; it does not expose the dashboard or task REST routes.

Caller ID is appropriate for this demo but is not strong identity verification for sensitive production data.

## Run locally

Use Node.js 22 or newer for the full Dial workflow.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The app works with the seeded Seattle Trip and Auth Project context right away. To enable an agent handoff, install and authenticate the Codex CLI in the same local environment.

### Configuration

Copy `.env.example` to `.env.local` and set only the values needed for your workflow:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `CONTEXT_HUB_API_URL` | Optional live Context Hub project endpoint. Leave unset to use the local fixture. |
| `CODEX_CLI_PATH` | Optional absolute path to the Codex CLI when it is not on `PATH`. |
| `DIAL_API_KEY` | Required only when configuring Dial. |
| `DIAL_NUMBER` | The Dial number assigned to the demo. |
| `REMIND_MCP_TOKEN` | Secret bearer token for the MCP endpoint. |
| `DIAL_ALLOWED_CALLERS` | Comma-separated E.164 caller allowlist. |

Never commit `.env.local` or `.remind/state.json`.

## Dial demo setup

For the full setup, including the local MCP gateway, public HTTPS endpoint, Dial configuration, and smoke test, see [docs/DIAL_SETUP.md](docs/DIAL_SETUP.md).

The usual local command is:

```bash
npm run dial:setup
npm run dial:dev
```

`dial:dev` starts the UI on `127.0.0.1:3000` and an MCP-only gateway on `127.0.0.1:3001`. A public HTTPS tunnel is deliberately not started for you; provide its `/api/dial/mcp` URL to `npm run dial:connect` when ready.

## Validate

```bash
npm run lint
npm run build
```

## Current boundaries

- The shipped Context Hub data is a local demonstration fixture, not automatic retrieval from every coding-agent conversation.
- Agent prompt generation requires the local Codex CLI and only sees the explicit task and context supplied to it.
- Task persistence is a local JSON file for a single process.
- Dial is optional and is guarded for demo use; production identity, storage, auditing, and consent requirements need a stronger implementation.
