"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { CallConnection, callConfiguration } from "@/lib/call-connection";
import { avatarProxyUrl, type ChatSignalKind } from "@/lib/collaboration-messages";

export type CallState =
  | { phase: "idle" }
  | { phase: "outgoing"; callId: string; startedAt: number }
  | { phase: "incoming"; callId: string }
  | { phase: "active"; callId: string; isCaller: boolean; connectedAt: number };

interface VideoCallStageProps {
  callId: string;
  isCaller: boolean;
  peerName: string;
  peerAvatarUrl: string | null;
  sendSignal: (kind: ChatSignalKind, payload: Record<string, unknown>) => Promise<void>;
  registerSignalHandler: (handler: (kind: string, payload: Record<string, unknown>) => void) => () => void;
  onEnd: (durationSeconds: number) => void;
}

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "U";
}

export function VideoCallStage({
  callId, isCaller, peerName, peerAvatarUrl, sendSignal, registerSignalHandler, onEnd,
}: VideoCallStageProps) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  const mountedAt = useRef<number>(0);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaError, setMediaError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting…");

  useEffect(() => {
    mountedAt.current = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - mountedAt.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let closed = false;
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(callConfiguration(
        process.env.NEXT_PUBLIC_TURN_URL,
        process.env.NEXT_PUBLIC_TURN_USERNAME,
        process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        process.env.NEXT_PUBLIC_CALL_ICE_POLICY,
      ));
    } catch {
      queueMicrotask(() => {
        if (!closed) setMediaError("Could not start this call. Please check the call configuration and try again.");
      });
      return () => { closed = true; };
    }
    pcRef.current = pc;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const clearRecovery = () => { clearTimeout(recoveryTimer); recoveryTimer = undefined; };
    if (isCaller) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
    }
    const bindMedia = async () => {
      if (closed) return;
      const stream = localStreamRef.current;
      for (const transceiver of pc.getTransceivers()) {
        if (closed) return;
        const kind = transceiver.receiver.track.kind;
        const track = stream?.getTracks().find(track => track.kind === kind) || null;
        transceiver.direction = "sendrecv";
        await transceiver.sender.replaceTrack(kind === "video" ? screenTrackRef.current || track : track);
        if (stream) transceiver.sender.setStreams(stream);
        if (kind === "video") videoSenderRef.current = transceiver.sender;
      }
    };

    const mediaReady = (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          if (!closed) setCameraOff(true);
        }
        if (closed) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setCameraAvailable(stream.getVideoTracks().length > 0);
        localStreamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        await bindMedia();
      } catch {
        if (!closed) setMediaError("Camera or microphone permission was denied. Check browser permissions to join with audio/video.");
      }
    })();
    const connection = new CallConnection(pc, callId, isCaller, mediaReady, sendSignal, () => {
      if (!closed) setConnectionStatus("Could not connect. Retry the connection or end this call.");
    }, bindMedia);
    const retry = () => {
      if (closed) return;
      clearRecovery();
      setConnectionStatus(attempts ? "Reconnecting…" : "Connecting…");
      void connection.retry();
      recoveryTimer = setTimeout(() => {
        recoveryTimer = undefined;
        if (closed) return;
        if (pc.connectionState === "connected") { setConnectionStatus("Connected"); return; }
        if (++attempts < 3) retry();
        else setConnectionStatus("Connection interrupted. Retry the connection or end this call.");
      }, 12000);
    };
    const recover = () => {
      attempts = 1;
      retry();
    };
    pc.onicecandidate = event => {
      if (event.candidate && !closed) {
        void sendSignal("call_ice", { call_id: callId, candidate: event.candidate.toJSON() }).catch(() => {
          if (!closed) setConnectionStatus("Call signaling was interrupted. Retry the connection.");
        });
      }
    };
    pc.ontrack = event => {
      if (closed || !remoteVideo.current) return;
      const stream = remoteVideo.current.srcObject as MediaStream | null || new MediaStream();
      if (!stream.getTracks().some(track => track.id === event.track.id)) stream.addTrack(event.track);
      remoteVideo.current.srcObject = stream;
    };
    pc.onconnectionstatechange = () => {
      if (closed) return;
      const connected = pc.connectionState === "connected";
      setRemoteConnected(connected);
      if (connected) {
        attempts = 0;
        clearRecovery();
        setConnectionStatus("Connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setConnectionStatus("Reconnecting…");
        if (!recoveryTimer) recoveryTimer = setTimeout(recover, 2000);
      }
    };
    const unregister = registerSignalHandler((kind, payload) => {
      if (closed) return;
      if (kind === "transport_ready") recover();
      else void connection.receive(kind, payload);
    });
    window.addEventListener("online", recover);
    const manualRetry = () => recover();
    // Keep manual retries on the same media session and call ID.
    retryRef.current = manualRetry;
    if (isCaller) retry();
    else recoveryTimer = setTimeout(recover, 12000);

    return () => {
      closed = true;
      unregister();
      clearRecovery();
      window.removeEventListener("online", recover);
      connection.close();
      retryRef.current = null;
      videoSenderRef.current = null;
      screenTrackRef.current?.stop();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      pc.close();
      pcRef.current = null;
    };
  }, [callId, isCaller, registerSignalHandler, sendSignal]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach(track => { track.enabled = !next; });
    setCameraOff(next);
  }

  async function toggleScreenShare() {
    const pc = pcRef.current;
    if (!pc) return;
    if (sharingScreen && screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = videoSenderRef.current;
      if (sender) await sender.replaceTrack(camTrack || null);
      setSharingScreen(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (pc !== pcRef.current) { display.getTracks().forEach(track => track.stop()); return; }
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) return;
      screenTrackRef.current = screenTrack;
      const sender = videoSenderRef.current;
      if (!sender) { screenTrack.stop(); return; }
      await sender.replaceTrack(screenTrack);
      setSharingScreen(true);
      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        const currentSender = videoSenderRef.current;
        if (currentSender) void currentSender.replaceTrack(camTrack || null).catch(() => {});
        screenTrackRef.current = null;
        setSharingScreen(false);
      };
    } catch { /* User cancelled screen picker. */ }
  }

  const avatar = avatarProxyUrl(peerAvatarUrl);

  return <div className="fl-call-stage" aria-label="Active video call">
    <div className="fl-call-topbar">
      <span className="fl-call-live-pill"><i aria-hidden="true" /> {remoteConnected ? "Live" : "Connecting"} · {formatTimer(elapsed)}</span>
      <strong>{peerName}</strong>
    </div>
    <div role="status" className="fl-call-connection-status">{connectionStatus}{!remoteConnected && <button type="button" onClick={() => retryRef.current?.()}>Retry connection</button>}</div>
    {mediaError && <p className="fl-call-media-error" role="alert">{mediaError}</p>}

    <div className="fl-call-video-wrap">
      <video ref={remoteVideo} autoPlay playsInline className="fl-call-remote-video" data-visible={remoteConnected} />
      {!remoteConnected && <div className="fl-call-remote-placeholder">
        {avatar ? <img src={avatar} alt={peerName} /> : <span>{initials(peerName)}</span>}
        <p>{mediaError || `${connectionStatus} ${peerName}`}</p>
      </div>}

      <div className="fl-call-local-pip" data-off={cameraOff}>
        <video ref={localVideo} autoPlay playsInline muted />
        {cameraOff && <span>Camera off</span>}
      </div>

      <div className="fl-call-controls" role="toolbar" aria-label="Call controls">
        <button type="button" data-off={muted} onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"} title={muted ? "Unmute" : "Mute"}>
          {muted ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button type="button" data-off={cameraOff} disabled={!cameraAvailable} onClick={toggleCamera} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} title={cameraOff ? "Camera on" : "Camera off"}>
          {cameraOff ? <VideoOff size={17} /> : <Video size={17} />}
        </button>
        <button type="button" data-active={sharingScreen} onClick={() => void toggleScreenShare().catch(() => setMediaError("Could not change screen sharing. Please try again."))} aria-label={sharingScreen ? "Stop sharing screen" : "Share screen"} title={sharingScreen ? "Stop sharing" : "Share screen"}>
          <MonitorUp size={17} />
        </button>
        <button type="button" className="fl-call-hangup" onClick={() => onEnd(elapsed)} aria-label="End call" title="End call">
          <PhoneOff size={17} />
        </button>
      </div>
    </div>
  </div>;
}

