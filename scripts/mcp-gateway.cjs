const http = require("node:http");
http.createServer(async (req, res) => {
  if (req.url !== "/api/dial/mcp" || req.method !== "POST") { res.writeHead(404); return res.end(); }
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 65536) { res.writeHead(413); return res.end(); } chunks.push(chunk); }
  const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
  for (const name of ["authorization", "x-dial-user-number", "x-dial-agent-number", "x-dial-direction", "mcp-protocol-version"]) if (req.headers[name]) headers[name] = req.headers[name];
  try {
    const response = await fetch("http://127.0.0.1:3000/api/dial/mcp", { method: "POST", headers, body: Buffer.concat(chunks) });
    res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/json" }); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(502); res.end("App unavailable"); }
}).listen(3001, "127.0.0.1", () => console.log("MCP-only gateway listening on http://127.0.0.1:3001"));
