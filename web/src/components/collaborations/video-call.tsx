"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
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

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      ...(process.env.NEXT_PUBLIC_TURN_USERNAME ? { username: process.env.NEXT_PUBLIC_TURN_USERNAME } : {}),
      ...(process.env.NEXT_PUBLIC_TURN_CREDENTIAL ? { credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL } : {}),
    });
  }
  return servers;
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
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const mountedAt = useRef<number>(0);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    mountedAt.current = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - mountedAt.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let closed = false;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pcRef.current = pc;

    pc.onicecandidate = event => {
      if (event.candidate && !closed) {
        void sendSignal("call_ice", { call_id: callId, candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = event => {
      if (remoteVideo.current && event.streams[0]) {
        remoteVideo.current.srcObject = event.streams[0];
        setRemoteConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setRemoteConnected(true);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setRemoteConnected(false);
      }
    };

    const unregister = registerSignalHandler((kind, payload) => {
      if (payload.call_id !== callId || closed) return;
      if (kind === "call_offer" && payload.sdp) {
        void (async () => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
            for (const c of pendingIce.current) await pc.addIceCandidate(new RTCIceCandidate(c));
            pendingIce.current = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("call_answer", { call_id: callId, sdp: answer });
          } catch { setMediaError("Could not negotiate video connection."); }
        })();
      } else if (kind === "call_answer" && payload.sdp) {
        void (async () => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
            for (const c of pendingIce.current) await pc.addIceCandidate(new RTCIceCandidate(c));
            pendingIce.current = [];
          } catch { setMediaError("Could not complete video handshake."); }
        })();
      } else if (kind === "call_ice" && payload.candidate) {
        const candidate = payload.candidate as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        } else {
          pendingIce.current.push(candidate);
        }
      }
    });

    void (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setCameraOff(true);
        }
        if (closed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal("call_offer", { call_id: callId, sdp: offer });
        }
      } catch {
        if (!closed) setMediaError("Camera or microphone permission was denied. Check browser permissions to join with audio/video.");
      }
    })();

    return () => {
      closed = true;
      unregister();
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
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      setSharingScreen(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) return;
      screenTrackRef.current = screenTrack;
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
      setSharingScreen(true);
      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        const currentSender = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
        if (currentSender && camTrack) void currentSender.replaceTrack(camTrack);
        screenTrackRef.current = null;
        setSharingScreen(false);
      };
    } catch { /* User cancelled screen picker. */ }
  }

  const avatar = avatarProxyUrl(peerAvatarUrl);

  return <div className="fl-call-stage" aria-label="Active video call">
    <div className="fl-call-topbar">
      <span className="fl-call-live-pill"><i aria-hidden="true" /> Live · {formatTimer(elapsed)}</span>
      <strong>{peerName}</strong>
    </div>

    <div className="fl-call-video-wrap">
      <video ref={remoteVideo} autoPlay playsInline className="fl-call-remote-video" data-visible={remoteConnected} />
      {!remoteConnected && <div className="fl-call-remote-placeholder">
        {avatar ? <img src={avatar} alt={peerName} /> : <span>{initials(peerName)}</span>}
        <p>{mediaError || `Connecting with ${peerName}…`}</p>
      </div>}

      <div className="fl-call-local-pip" data-off={cameraOff}>
        <video ref={localVideo} autoPlay playsInline muted />
        {cameraOff && <span>Camera off</span>}
      </div>

      <div className="fl-call-controls" role="toolbar" aria-label="Call controls">
        <button type="button" data-off={muted} onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"} title={muted ? "Unmute" : "Mute"}>
          {muted ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button type="button" data-off={cameraOff} onClick={toggleCamera} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} title={cameraOff ? "Camera on" : "Camera off"}>
          {cameraOff ? <VideoOff size={17} /> : <Video size={17} />}
        </button>
        <button type="button" data-active={sharingScreen} onClick={() => void toggleScreenShare()} aria-label={sharingScreen ? "Stop sharing screen" : "Share screen"} title={sharingScreen ? "Stop sharing" : "Share screen"}>
          <MonitorUp size={17} />
        </button>
        <button type="button" className="fl-call-hangup" onClick={() => onEnd(elapsed)} aria-label="End call" title="End call">
          <PhoneOff size={17} />
        </button>
      </div>
    </div>
  </div>;
}

