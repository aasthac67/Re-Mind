export function localRequest(req: Request) {
  const host = req.headers.get("host")?.split(":")[0];
  if (host !== "127.0.0.1" && host !== "localhost") return false;
  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded && forwarded !== req.headers.get("host")) return false;
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
