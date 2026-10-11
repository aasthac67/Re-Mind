const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { parseEnv } = require("node:util");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
function configure(directory, caller) {
  if (caller && !/^\+[1-9]\d{7,14}$/.test(caller)) throw new Error("Use an E.164 caller number such as +14155550123.");
  const envPath = path.join(directory, ".env.local");
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const env = parseEnv(text);
  const defaults = { DIAL_API_KEY: "", DIAL_NUMBER: "+19896018765", REMIND_MCP_TOKEN: crypto.randomBytes(32).toString("hex"), DIAL_ALLOWED_CALLERS: caller || "" };
  for (const [key, value] of Object.entries(defaults)) {
    if (!env[key]) {
      const line = key + "=" + JSON.stringify(value);
      const pattern = new RegExp("^" + key + "=.*$", "m");
      text = pattern.test(text) ? text.replace(pattern, () => line) : text + "\n" + line + "\n";
    }
  }
  fs.writeFileSync(envPath, text, { mode: 0o600 });
  fs.mkdirSync(path.join(directory, ".remind"), { recursive: true });
  return { configuredKey: Boolean(parseEnv(text).DIAL_API_KEY), configuredCaller: Boolean(parseEnv(text).DIAL_ALLOWED_CALLERS) };
}
function main() {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Install Node.js 22 or newer, then run setup again.");
  const args = process.argv.slice(2);
  const index = args.indexOf("--caller");
  if (index >= 0 && !args[index + 1]) throw new Error("--caller requires a phone number.");
  if (!args.includes("--skip-install")) {
    const npm = process.env.npm_execpath;
    const install = npm ? spawnSync(process.execPath, [npm, "ci"], { cwd: root, stdio: "inherit" }) : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    if (install.status !== 0) throw new Error("Dependency installation failed.");
  }
  const state = configure(root, index >= 0 ? args[index + 1] : undefined);
  console.log("Local setup ready. Existing credentials and task data were preserved.");
  console.log("Edit .env.local: " + (!state.configuredKey ? "add DIAL_API_KEY; " : "") + (!state.configuredCaller ? "add DIAL_ALLOWED_CALLERS; " : "") + "check DIAL_NUMBER.");
  console.log("Run npm run dial:dev, then open http://127.0.0.1:3000.");
  console.log("No tunnel was started and no Dial account settings were changed.");
}
module.exports = { configure };
if (require.main === module) { try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
