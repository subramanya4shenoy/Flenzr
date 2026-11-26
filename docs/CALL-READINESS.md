# Collaboration call qualification

Step 35, 26 November 2026. The user chose to skip physical-device and separate-network testing. Local qualification uses two isolated Chrome sessions, generated canvas/audio MediaStreamTracks, the actual application UI/BFF/API, native RTCPeerConnection and a loopback-only coturn server. Camera capture hung in the host browser, so native camera/microphone hardware is not part of this pass. Permission errors and screen selection are simulated in the browser harness. ICE, RTP, signaling and the TURN server are real.

## Changes

- SDP operations wait for media acquisition and run in sequence. The callee binds tracks to the transceivers created by the remote offer before answering. This avoids the one-way media caused by precreating competing callee transceivers or answering before local tracks are ready.
- One designated caller creates offers. The callee requests a restart using the existing authenticated signaling route, avoiding simultaneous recovery offers. An outstanding offer is resent if its answer was lost; stable signaling creates a fresh ICE-restart offer. ICE candidates are bounded and buffered until a remote description exists.
- A failed/disconnected connection, browser `online` event or restored SSE stream triggers recovery. Recovery is limited to three attempts with 12-second waits; Retry connection is available while disconnected. The call ID and local media remain intact. A full page reload does not restore call state; start a new call.
- Remote media works when track events contain no stream. Camera, microphone, screen and peer-connection cleanup run on exit. Screen sharing also works from an audio-only participant using the video sender reserved by the offer; stopping returns to the camera or to an empty sender. Camera controls stay disabled when no camera track exists.
- Call-signal errors reach the UI. Failed invitations return to idle, failed acceptance preserves the invitation, and ending locally reports if the other participant could not be notified. Typing/heartbeat failures remain nonfatal.

## Relay configuration

Set these values in the **web build environment**, then rebuild:

```dotenv
NEXT_PUBLIC_TURN_URL=turn:relay.example.com:3478?transport=udp,turn:relay.example.com:3478?transport=tcp,turns:relay.example.com:5349?transport=tcp
NEXT_PUBLIC_TURN_USERNAME=limited-lifetime-username
NEXT_PUBLIC_TURN_CREDENTIAL=limited-lifetime-credential
NEXT_PUBLIC_CALL_ICE_POLICY=all
```

These values are visible to browsers. A deployment needs a private server-side credential issuer/provider and limited-lifetime relay credentials; no such issuer or production TURN service was provisioned in this step. `all` allows direct connectivity and TURN fallback. `relay` forces relay traffic for qualification and requires a TURN URL. Comma-separated URLs allow multiple transports. The local checks qualify UDP and TCP allocation separately; TURN over TLS and firewall behavior on separate networks remain unverified.

Production/staging still needs HTTPS, reachable TURN ports and relay range, deployment-appropriate limited-lifetime credentials, and shared Redis configuration across API workers. The Step 34 shared-worker signaling test is separate; this browser qualification uses one isolated API process. No public tunnel was created and no production environment was changed.

## Repeat the isolated browser check

Use the disposable Step 32 fixture and API/web ports described in [COLLABORATION-JOURNEY.md](COLLABORATION-JOURNEY.md). Calls remain available on completed collaborations; uploads from the older fixture need not remain accessible. Keep test tokens in the private fixture file, outside the repository. Run the web source from an isolated copy to avoid replacing the running development build.

Install coturn and create a private configuration at `/tmp/flenzr-call-qualification-turn.conf` with a temporary test username/password matching the isolated web environment:

```ini
listening-ip=127.0.0.1
relay-ip=127.0.0.1
listening-port=53479
min-port=56000
max-port=56080
realm=flenzr-qa.local
lt-cred-mech
user=qa:local-test-only
allow-loopback-peers
no-cli
no-tls
no-dtls
no-multicast-peers
pidfile=/tmp/flenzr-call-qualification-turn.pid
log-file=/tmp/flenzr-call-qualification-turn.log
```

This is a loopback-only test configuration. Start `turnserver -c /tmp/flenzr-call-qualification-turn.conf`. For the isolated web process, set username `qa`, credential `local-test-only`, policy `relay` and URL `turn:127.0.0.1:53479?transport=udp`. Repeat with only `transport=tcp` and a restarted web process to prove TCP allocation. The normal application environment files are not changed by this setup.

Launch a dedicated headless Chrome instance:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9362 \
  --user-data-dir=/tmp/flenzr-call-qa-chrome-20261126 \
  --autoplay-policy=no-user-gesture-required about:blank
```

Run from the repository root:

```sh
FLENZR_QA_ALLOW_TURN_RESTART=1 \
FLENZR_QA_EXPECT_RELAY_PROTOCOL=udp \
FLENZR_QA_RESULT=/tmp/flenzr-call-network-udp-result.json \
node web/tests/call-network.browser.mjs
```

Use `FLENZR_QA_EXPECT_RELAY_PROTOCOL=tcp` for the TCP run. The runner deliberately stops/restarts the TURN PID recorded in its test PID file; use only your dedicated test process. It closes its browser contexts but leaves service shutdown to the operator. Optional `FLENZR_QA_WEB_ORIGIN`, `FLENZR_QA_CHROME_URL`, `FLENZR_QA_FIXTURE`, `FLENZR_QA_TURN_BINARY`, `FLENZR_QA_TURN_CONFIG` and `FLENZR_QA_TURN_PID_FILE` support another isolated setup. Stop the test API, web, browser and TURN processes when finished.

The runner checks selected relay candidates using getStats, decoded video in both directions, a 1.5-second callee media delay, camera/microphone toggles, TURN interruption and recovery with a different candidate pair and advancing media counters, screen sender replacement/restoration, audio-only screen sharing, hangup cleanup, simulated permission denial, invitation/acceptance 503 recovery and uncaught browser errors.

## Recorded results

- **174 web tests passed**, including nine call configuration/negotiation regression checks. TypeScript passed. Focused chat/call ESLint reports zero errors and two existing image warnings.
- The local browser runner passed all nine scenarios with UDP relay and again with TCP-only relay. Both participants selected relay candidates; getStats identified `relayProtocol=udp` and `relayProtocol=tcp` respectively. The TCP recovery check additionally samples advancing media counters after selecting the new relay pair. Both runs reported zero uncaught browser exceptions.
- The runner uses generated canvas/audio tracks and a simulated screen source and permission denial. These results establish local native WebRTC/TURN behavior through the current UI, not real camera capture or an actual OS screen picker. No claim is made about native media permissions on this host.
- The previous backend baseline remains 583 passed / 20 opt-in skips from Step 34; no backend code or API schema changed in Step 35.

## Remaining coverage

Physical devices and separate Wi-Fi/mobile networks are skipped at the user's request. Native camera/microphone permissions, native screen pickers, Safari/Firefox interoperability, TURN TLS, long disconnects, full-reload rejoin and staging/production load are unverified. Local results do not establish production call readiness. The next workstream is staging configuration and full collaboration regression, with these omissions carried forward.
