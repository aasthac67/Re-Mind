const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { parseEnv } = require("node:util");
const { DialClient } = require("@getdial/sdk");
const root = path.resolve(__dirname, "..");
async function main() {
  const args = process.argv.slice(2), i = args.indexOf("--url");
  if (i < 0 || !args[i + 1]) throw new Error("Usage: npm run dial:connect -- --url https://YOUR-HOST/api/dial/mcp");
  const url = new URL(args[i + 1]);
  if (url.protocol !== "https:" || url.pathname !== "/api/dial/mcp" || url.search || url.username || url.password) throw new Error("Provide a public HTTPS URL ending in /api/dial/mcp, without query parameters or credentials.");
  const env = parseEnv(fs.readFileSync(path.join(root, ".env.local"), "utf8"));
  for (const key of ["DIAL_API_KEY", "DIAL_NUMBER", "REMIND_MCP_TOKEN", "DIAL_ALLOWED_CALLERS"]) if (!env[key]) throw new Error("Missing " + key + " in .env.local.");
  console.log("Connecting Dial to " + url.origin + ". This grants the managed voice agent access to this machine's task tools for authorized inbound callers.");
  const client = new DialClient({ apiKey: env.DIAL_API_KEY });
  const number = (await client.listNumbers()).find(n => n.number === env.DIAL_NUMBER);
  if (!number) throw new Error("DIAL_NUMBER is not on this Dial account.");
  if (!number.capabilities.includes("call") || number.callingEnabled === false || number.forwardTo) throw new Error("Enable AI inbound calling on this number and remove phone forwarding before connecting.");
  const base = "https://api.getdial.ai/api/v1/context-mcps";
  const headers = { Authorization: "Bearer " + env.DIAL_API_KEY, "Content-Type": "application/json" };
  const existingResponse = await fetch(base, { headers });
  if (!existingResponse.ok) throw new Error("Unable to inspect existing Dial connections (HTTP " + existingResponse.status + ").");
  const existingData = await existingResponse.json();
  const connections = existingData.contextMcps || existingData.contextMCPs || existingData;
  if (!Array.isArray(connections)) throw new Error("Unexpected connection-list response. Inspect Dial Context MCPs before proceeding.");
  const existing = connections.find(c => c.url === url.href && c.status === "connected");
  if (connections.some(c => c.name?.startsWith("Re:Mind") && c.id !== existing?.id && c.status === "connected")) throw new Error("Another Re:Mind server is connected. Disconnect the old Re:Mind connection in Dial Context MCPs first to avoid ambiguous duplicate tools.");
  fs.mkdirSync(path.join(root, ".remind"), { recursive: true });
  const backup = path.join(root, ".remind/dial-number-before-connect.json");
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify({ numberId: number.id, inboundInstruction: number.inboundInstruction }, null, 2));
  let connection = existing;
  if (!connection) {
    const response = await fetch(base, { method: "POST", headers, body: JSON.stringify({ name: "Re:Mind — " + os.hostname(), url: url.href, headers: { Authorization: "Bearer " + env.REMIND_MCP_TOKEN }, timeoutMs: 20000 }) });
    if (!response.ok) throw new Error("Dial connection failed (HTTP " + response.status + "). Check URL reachability and the MCP token.");
    connection = (await response.json()).contextMcp;
  }
  if (!connection || connection.status !== "connected" || connection.toolCount !== 4) throw new Error("Dial did not discover all four Re:Mind tools. Check the connection in the dashboard.");
  await client.setNumberProperties(number.id, { inboundInstruction: "You are Re:Mind, a concise task and project assistant. Introduce yourself and ask how you can help. Use get_project_context for recaps and list_tasks for pending tasks or task IDs. Project briefs are seeded demo context; task state is real and persisted. For new tasks ask the caller to confirm title, project and optional due date, then call create_task with confirmed=true and a unique requestId; reuse the same requestId if retrying. For status changes first list tasks and confirm the exact task and new status, then call update_task_status with confirmed=true. Never claim a write succeeded until its tool reports success. If a tool denies access, say this phone is not authorized and do not disclose records. Do not infer completion. Creating a booking task does not make a reservation or purchase. Do not promise automatic access to other agents." });
  console.log("Connected: four tools discovered; inbound instructions updated.");
  console.log("Call " + env.DIAL_NUMBER + " from an allowed phone. Keep the app and your chosen HTTPS endpoint running.");
}
main().catch(e => { console.error(e.message?.startsWith("Dial") || e.message?.startsWith("Missing") || e.message?.startsWith("Usage") || e.message?.startsWith("Another") || e.message?.startsWith("Provide") || e.message?.startsWith("Unexpected") || e.message?.startsWith("Enable") || e.message?.startsWith("Unable") ? e.message : "Connection setup failed. Check local configuration and Dial settings; credentials were not displayed."); process.exitCode = 1; });
