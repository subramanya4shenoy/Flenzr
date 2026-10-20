// Public avatars are intentionally public; this is not a general-purpose URL proxy.
const IMAGE_HOSTS = ["cdninstagram.com", "fbcdn.net", "ytimg.com", "ggpht.com", "googleusercontent.com"];
function allowed(url: URL) {
  return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
    IMAGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}
function fallback(name: string) {
  const initial = name.charAt(0).toUpperCase().replace(/[<>&"']/g, "");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#18181b"/><text x="64" y="78" text-anchor="middle" fill="white" font-size="52">${initial || "F"}</text></svg>`, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
  });
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("url");
  const name = params.get("name") || "Flenzr";
  if (!target) return fallback(name);
  try {
    const url = new URL(target);
    if (!allowed(url)) return new Response("Image host is not allowed", { status: 400 });
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { Accept: "image/jpeg,image/png,image/webp,image/avif" } });
    // Reject redirects rather than following them into internal networks.
    if (!res.ok || !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(res.headers.get("content-type")?.split(";")[0] || "")) return fallback(name);
    if (Number(res.headers.get("content-length")) > 5 * 1024 * 1024) return fallback(name);
    const reader = res.body?.getReader();
    if (!reader) return fallback(name);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); return fallback(name); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new Response(bytes, { headers: { "Content-Type": res.headers.get("content-type")!, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return fallback(name); }
}
