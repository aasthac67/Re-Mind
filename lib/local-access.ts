export function localRequest(req: Request) {
  const authority = req.headers.get("host");
  if (!authority) return false;
  let hostUrl: URL;
  try { hostUrl = new URL(`http://${authority}`); } catch { return false; }
  if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost") return false;
  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded && forwarded !== authority) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const browserOrigin = new URL(origin);
    return browserOrigin.host === authority && browserOrigin.protocol === new URL(req.url).protocol;
  } catch { return false; }
}
