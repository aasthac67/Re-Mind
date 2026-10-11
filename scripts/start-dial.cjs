const { spawn } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Node.js 22 or newer is required."); process.exit(1); }
const children = [
  spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [path.join(root, "scripts/mcp-gateway.cjs")], { cwd: root, stdio: "inherit" })
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return; stopping = true; process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
for (const child of children) { child.on("error", () => stop(1)); child.on("exit", code => { if (!stopping) stop(code || 0); }); }
console.log("Starting Re:Mind UI on :3000 and MCP-only gateway on :3001. No public tunnel is started.");
