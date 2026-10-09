// Webcam + MediaPipe Hand Landmarker. Produces landmarks in *screen pixels*,
// mirrored and mapped through the same object-fit: cover crop as the <video>,
// so overlays and picking line up with what the user sees.

const MP_VERSION = '0.10.14';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  constructor(video) {
    this.video = video;
    this.landmarker = null;
    this.stream = null;
    this.lastVideoTime = -1;
    this.camFrames = 0;
    this.camFps = 0;
    this.inferMs = 0;
    this.delegate = 'GPU';
    this.hands = [];
    this.fpsWindowStart = performance.now();
  }

  get running() {
    return Boolean(this.stream);
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    if (!this.landmarker) await this.#load();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.hands = [];
  }

  async #load() {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const options = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options('GPU'));
    } catch {
      this.delegate = 'CPU';
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options('CPU'));
    }
  }

  // Maps a normalized landmark to mirrored screen pixels (object-fit: cover).
  #toScreen(p, W, H) {
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const s = Math.max(W / vw, H / vh);
    const dw = vw * s;
    const dh = vh * s;
    const ox = (W - dw) / 2;
    const oy = (H - dh) / 2;
    return [W - (ox + p.x * dw), oy + p.y * dh, p.z * dw];
  }

  /** Runs detection if a new video frame is available. Returns true if hands changed. */
  detect(W, H) {
    const now = performance.now();
    if (now - this.fpsWindowStart > 1000) {
      this.camFps = Math.round((this.camFrames * 1000) / (now - this.fpsWindowStart));
      this.camFrames = 0;
      this.fpsWindowStart = now;
    }
    if (!this.landmarker || !this.stream || this.video.readyState < 2) return false;
    if (this.video.currentTime === this.lastVideoTime) return false;
    this.lastVideoTime = this.video.currentTime;
    this.camFrames++;
    const t0 = performance.now();
    const result = this.landmarker.detectForVideo(this.video, t0);
    const dt = performance.now() - t0;
    this.inferMs = this.inferMs ? this.inferMs * 0.9 + dt * 0.1 : dt;
    this.hands = (result.landmarks ?? []).map((lm) => lm.map((p) => this.#toScreen(p, W, H)));
    return true;
  }
}
