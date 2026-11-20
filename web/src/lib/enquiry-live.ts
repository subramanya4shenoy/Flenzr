// One connection per dashboard, with bounded retries, burst coalescing and
// heartbeat detection. No event payload is used as application data.
export function subscribeEnquiryActivity(onChange: () => void, onConnected: (connected: boolean) => void) {
  let source: EventSource | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let batch: ReturnType<typeof setTimeout> | undefined;
  let lastHeartbeat = 0;
  let stopped = false;
  function changed() {
    if (!batch) batch = setTimeout(() => { batch = undefined; if (!stopped) onChange(); }, 150);
  }
  function disconnect() {
    source?.close(); source = undefined;
    onConnected(false);
  }
  function reconnect() {
    disconnect();
    clearTimeout(retry);
    if (!stopped && document.visibilityState !== "hidden") {
      retry = setTimeout(connect, 10_000 + Math.random() * 10_000);
    }
  }
  function connect() {
    if (stopped || document.visibilityState === "hidden") return;
    const connection = new EventSource("/api/enquiries/live");
    source = connection;
    const current = () => !stopped && source === connection;
    lastHeartbeat = Date.now();
    connection.addEventListener("ready", () => {
      if (!current()) return;
      lastHeartbeat = Date.now(); onConnected(true); changed();
    });
    connection.addEventListener("heartbeat", () => { if (current()) lastHeartbeat = Date.now(); });
    connection.addEventListener("changed", () => { if (current()) changed(); });
    connection.addEventListener("unavailable", () => { if (current()) reconnect(); });
    connection.addEventListener("rotate", () => {
      if (!current()) return;
      disconnect();
      retry = setTimeout(connect, Math.random() * 1000);
    });
    connection.onerror = () => { if (current()) reconnect(); };
  }
  function visibility() {
    clearTimeout(retry);
    disconnect();
    if (document.visibilityState !== "hidden") connect();
  }
  const watchdog = setInterval(() => {
    if (source && Date.now() - lastHeartbeat > 45_000) reconnect();
  }, 15_000);
  document.addEventListener("visibilitychange", visibility);
  connect();
  return () => {
    stopped = true;
    clearTimeout(retry); clearTimeout(batch); clearInterval(watchdog);
    document.removeEventListener("visibilitychange", visibility);
    source?.close(); source = undefined;
  };
}
