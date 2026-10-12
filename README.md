# Re:Mind

Re:Mind is a project-backed continuity system for work that gets scattered across AI conversations. It turns the decisions, sources, tasks, and next moves from agent work into a durable project record—so a person or agent can resume with confidence instead of reconstructing the past from transcripts.

> This repository is the local development implementation for the LifeMaxx / SpeedHacks 2026 concept. It runs the same product contracts locally today and is designed to connect to the durable, project-backed services that power the final product.

## The problem

Conversations with coding agents contain the details that make work resumable: decisions, constraints, blockers, unfinished tasks, and the exact point where work stopped. Those details are typically trapped in separate sessions. Starting again means rereading transcripts, re-explaining intent, and risking duplicated or contradictory work. A task list loses the reasoning; a transcript does not make ownership and the next action clear.

## The solution

Re:Mind combines the two views needed to resume work confidently:

- **Context Hub** presents the project record as a compact, source-linked brief: summary, decisions, timeline, active context, and recommended next action.
- **Action Hub** turns that context into an execution system. Tasks can be captured, assigned a clear state, and handed to an agent with a tailored continuation prompt.
- **Dial Context MCP** is an optional voice-facing interface for reading project context and creating or updating tasks after explicit confirmation.

The result is a reliable handoff layer: every continuation receives the bounded context it needs, while people retain a clear, inspectable view of the work record. Re:Mind does not ask an agent to guess at history; it supplies the relevant, attributable project state.

## Product architecture

```text
Agent sessions, work sources, and user updates
                       |
                       v
        Project-backed continuity record
  (context, decisions, sources, tasks, and state)
                       |
          +------------+------------+
          |                         |
          v                         v
  Context Hub and Action Hub   Agent-ready handoff
          ^                         |
          |                         v
  Optional Dial Context MCP   Read-only Codex prompt generation
```

### 1. A project-backed context record

In the final product, Re:Mind maintains a durable project record that links the work's context, decisions, sources, action items, and current state. That record is the continuity layer between agents: it lets a new session understand what matters, why it matters, and what outcome is expected without relying on recollection or an unbounded conversation dump.

The dashboard consumes a stable project contract: name, short summary, decisions, next action, sources, timeline, and last-updated time. This separation lets Re:Mind add or change context providers without rewriting the product experience.

For local development, this repository serves that contract from `lib/workspace.ts` through `GET /api/context-hub`. Set `CONTEXT_HUB_API_URL` to a compatible project service when the shared context backend is available; the handoff route will use it automatically.

### 2. A durable action system

In production, Action Hub is backed by the same shared project record. Each task has a project, source, lifecycle state, and clear next move, so it can move safely between a person, an agent, and an optional voice interaction. This closes the gap between understanding the work and actually moving it forward.

The local implementation reads and writes tasks through `/api/tasks` and persists them to `.remind/state.json` with serialized, atomic writes. That gives the demo real task capture, status changes, drag-and-drop updates, and persistence across page refreshes. The final multi-user deployment replaces this local development store with a shared project-backed database.

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

## Local development scope and production path

This repository is intentionally self-contained so the complete product flow can be run and demonstrated on one machine. Its local Context Hub implementation supplies the same project contract the shared context service will provide, and its local task store exercises the same Action Hub workflow the shared project-backed database will own.

- The local Context Hub data is a development dataset, not a claim of automatic retrieval from every coding-agent conversation.
- A production context service will populate the project record from approved sources and retain source attribution, decisions, and state over time.
- A production action store will replace the single-process JSON file with shared persistence, access controls, auditing, and collaboration semantics.
- Agent prompt generation already uses only the explicit task and project context supplied to it; the local Codex CLI is required for this development flow.
- Dial remains optional. Its demo protections are appropriate for a local prototype; production voice access requires stronger identity, consent, and policy enforcement.
