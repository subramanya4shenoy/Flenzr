import type { ChatSignalKind } from "./collaboration-messages";

export function callConfiguration(turnUrl = "", username = "", credential = "", policy = "all"): RTCConfiguration {
  const urls = turnUrl.split(",").map(url => url.trim()).filter(Boolean);
  if (policy === "relay" && !urls.length) throw new Error("A relay server is required for this call configuration.");
  return {
    iceTransportPolicy: policy === "relay" ? "relay" : "all",
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      ...(urls.length ? [{ urls, username, credential }] : []),
    ],
  };
}

/** A single offerer prevents simultaneous recovery offers from colliding.
 * SDP work waits for local media and is serialized with candidate application.
 */
export class CallConnection {
  private work: Promise<void> = Promise.resolve();
  private pendingIce: RTCIceCandidateInit[] = [];
  private closed = false;

  constructor(
    private pc: RTCPeerConnection,
    private callId: string,
    private isCaller: boolean,
    private mediaReady: Promise<void>,
    private send: (kind: ChatSignalKind, payload: Record<string, unknown>) => Promise<void>,
    private onError: () => void,
    private bindRemoteMedia: () => Promise<void> = async () => {},
  ) {}

  private enqueue(action: () => Promise<void>): Promise<void> {
    this.work = this.work.then(async () => {
      await this.mediaReady;
      if (!this.closed) await action();
    }).catch(() => { if (!this.closed) this.onError(); });
    return this.work;
  }

  retry(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.isCaller) {
        await this.send("call_offer", { call_id: this.callId, restart: true });
      } else {
        // A lost answer leaves an outstanding offer. Re-send it rather than
        // inventing a second offer while signaling is not stable.
        if (this.pc.signalingState === "stable") {
          await this.pc.setLocalDescription(await this.pc.createOffer({ iceRestart: true }));
        }
        if (this.closed || !this.pc.localDescription) return;
        await this.send("call_offer", { call_id: this.callId, sdp: this.pc.localDescription.toJSON() });
      }
    });
  }

  receive(kind: string, payload: Record<string, unknown>): Promise<void> {
    if (payload.call_id !== this.callId) return Promise.resolve();
    if (kind === "call_offer" && payload.restart === true && this.isCaller) return this.retry();
    return this.enqueue(async () => {
      if (kind === "call_offer" && payload.sdp && !this.isCaller) {
        await this.pc.setRemoteDescription(payload.sdp as RTCSessionDescriptionInit);
        if (this.closed) return;
        await this.bindRemoteMedia();
        await this.flushIce();
        await this.pc.setLocalDescription(await this.pc.createAnswer());
        if (!this.closed) await this.send("call_answer", { call_id: this.callId, sdp: this.pc.localDescription!.toJSON() });
      } else if (kind === "call_answer" && payload.sdp && this.isCaller && this.pc.signalingState === "have-local-offer") {
        await this.pc.setRemoteDescription(payload.sdp as RTCSessionDescriptionInit);
        if (this.closed) return;
        await this.bindRemoteMedia();
        await this.flushIce();
      } else if (kind === "call_ice" && payload.candidate) {
        const candidate = payload.candidate as RTCIceCandidateInit;
        if (this.pc.remoteDescription) {
          // Old-generation candidates can arrive after an ICE restart.
          await this.pc.addIceCandidate(candidate).catch(() => {});
        } else if (this.pendingIce.length < 256) {
          this.pendingIce.push(candidate);
        }
      }
    });
  }

  private async flushIce() {
    for (const candidate of this.pendingIce.splice(0)) {
      if (this.closed) return;
      await this.pc.addIceCandidate(candidate).catch(() => {});
    }
  }

  close() {
    this.closed = true;
    this.pendingIce = [];
  }
}
