# Teammate setup: call Re:Mind and save a task

Use the dial-integration branch. Node.js 22+ and npm are required.

## 1. Install and configure locally

```sh
git clone --branch dial-integration https://github.com/aasthac67/Re-Mind.git
cd Re-Mind
npm run dial:setup -- --caller +1YOUR_PHONE_NUMBER
```

The branch must be pushed before a teammate can clone it. For an existing clone, fetch and switch to dial-integration.

Setup installs locked dependencies, creates .env.local if needed, generates a separate MCP secret, and preserves existing credentials and tasks. Edit .env.local to add your Dial API key, check DIAL_NUMBER, and set DIAL_ALLOWED_CALLERS to the caller's E.164 number. Multiple allowed numbers can be comma-separated. Setup does not start a tunnel or modify Dial.

Never send .env.local or your .remind folder to Git. If teammates share a Dial account, use a single active Re:Mind Context MCP connection; duplicate tools on multiple servers can send actions to the wrong machine.

## 2. Start the UI and tools

```sh
npm run dial:dev
```

Open http://127.0.0.1:3000 and select Action Hub. This starts the Next.js app plus a gateway on 127.0.0.1:3001. Only POST /api/dial/mcp is forwarded by that gateway.

## 3. Make the tools reachable by Dial

A real incoming call cannot reach localhost directly. The teammate must provide a public HTTPS endpoint, through their own deployment or explicitly chosen tunnel. If using a tunnel, expose port 3001, not the dashboard on port 3000. Example, after installing and choosing to run ngrok:

```sh
ngrok http 3001
```

Use the resulting HTTPS hostname followed by /api/dial/mcp. Cloudflare Quick Tunnels can also carry this JSON-response MCP endpoint. The tunnel provider carries task/context traffic; Dial gets the tool credential and can use the authorized tools during calls.

## 4. Connect the chosen URL to Dial

Run this only when ready to grant Dial access to the tools and change this number's inbound instructions:

```sh
npm run dial:connect -- --url https://YOUR_HOST/api/dial/mcp
```

This registers the Context MCP with a bearer token, verifies four tools were discovered, and updates the inbound voice prompt. It saves the previous prompt in .remind/dial-number-before-connect.json. It refuses to continue if another Re:Mind server is active on the account; disconnect that old connection in Dial Context MCPs deliberately first. Other MCP integrations are preserved.

If the URL changes after a tunnel restart, disconnect the old Re:Mind connection and run dial:connect with the new URL. Account settings apply to the shared number, so coordinate with teammates.

## 5. Call and verify

From an allowed caller phone, call the configured Dial number. Say: "Add a task to book a rental car for my Seattle trip." Confirm the title and project when asked. The task appears under Suggested in Action Hub within about three seconds. Reload to verify persistence. An existing identical open task is returned rather than duplicated.

Try a distinct title such as "Compare Seattle rental pickup locations" to clearly see a new task. Ask for Seattle's recap or explicitly request a task status change.

## Local text-file storage

Tasks, status changes, request IDs and activity events are stored in .remind/state.json as readable JSON text. It is created when the app first loads tasks and updated using serialized atomic writes. No database service is required. Project context starts from seeded demo data. Each machine has its own file; this does not synchronize data between teammates. Run one app process per data directory.

## Local checks without Dial

```sh
npm run dial:check
```

With dial:dev running, verifies setup repeatability, isolated file persistence, request deduplication, MCP discovery, authorization and rejection of cross-origin task requests. It makes no Dial calls and changes no Dial account settings.

Caller-number checks are adequate for the demo, not strong identity verification for sensitive production records. A production deployment needs proper authentication, a shared database and a stable URL.
