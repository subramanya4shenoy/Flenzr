export interface PublicImage {
  bytes: ArrayBuffer;
  contentType: string;
  etag: string;
}

export class PublicImageCache {
  private entries = new Map<string, { image: PublicImage; expiresAt: number }>();
  private pending = new Map<string, Promise<PublicImage | null>>();
  private size = 0;

  constructor(private maxBytes = 24 * 1024 * 1024, private maxEntries = 128, private lifetime = 3600000) {}

  private remove(key: string) {
    const entry = this.entries.get(key);
    if (entry) this.size -= entry.image.bytes.byteLength;
    this.entries.delete(key);
  }

  get(key: string, now = Date.now()): PublicImage | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) { this.remove(key); return null; }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.image;
  }

  set(key: string, image: PublicImage, now = Date.now()) {
    this.remove(key);
    if (image.bytes.byteLength > this.maxBytes) return;
    this.entries.set(key, { image, expiresAt: now + this.lifetime });
    this.size += image.bytes.byteLength;
    while (this.entries.size > this.maxEntries || this.size > this.maxBytes) {
      this.remove(this.entries.keys().next().value!);
    }
  }

  load(key: string, loader: () => Promise<PublicImage | null>): Promise<PublicImage | null> {
    const cached = this.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(key);
    if (pending) return pending;
    const task = loader().then((image) => { if (image) this.set(key, image); return image; });
    this.pending.set(key, task);
    const cleanup = () => { if (this.pending.get(key) === task) this.pending.delete(key); };
    void task.then(cleanup, cleanup);
    return task;
  }
}
