import { RealtimeClient } from "@supabase/realtime-js";
import { accessToken, currentIdentity, requestOrigin } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session tokens remain server-side. Each tab has one stream shared by its
// dashboard. Supabase distributes committed events across all web instances.
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== requestOrigin(request))) {
    return new Response(null, { status: 403 });
  }
  const identity = await currentIdentity();
  const token = identity ? await accessToken() : undefined;
  if (!identity || !token) return new Response(null, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new Response(null, { status: 503 });

  const realtime = new RealtimeClient(`${url.replace(/\/$/, "")}/realtime/v1`, {
    params: { apikey: key }, accessToken: async () => token,
  });
  const encoder = new TextEncoder();
  let finish = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat); clearTimeout(lifetime);
        request.signal.removeEventListener("abort", finish);
        void realtime.removeAllChannels().catch(() => {}).then(() => realtime.disconnect()).catch(() => {});
        try { controller.close(); } catch { /* The reader may have cancelled first. */ }
      };
      const send = (event: string) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
      };
      const lifetime = setTimeout(() => { send("rotate"); finish(); }, 240_000 + Math.random() * 30_000);
      controller.enqueue(encoder.encode("retry: 5000\n\n"));
      request.signal.addEventListener("abort", finish, { once: true });
      if (request.signal.aborted) { finish(); return; }
      // Revalidate the cookie/active account periodically, also recovering missed
      // signals by refreshing state on every new subscription.
      try {
        realtime.channel(`enquiries:${identity.user.id}`, { config: { private: true } })
        .on("broadcast", { event: "enquiries_changed" }, () => send("changed"))
        .subscribe(status => {
          if (closed) return;
          if (status === "SUBSCRIBED") {
            send("ready");
            clearInterval(heartbeat);
            heartbeat = setInterval(() => send("heartbeat"), 15_000);
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            send("unavailable"); finish();
          }
        });
      } catch { send("unavailable"); finish(); }
    },
    cancel() { finish(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no", "Connection": "keep-alive",
  } });
}
