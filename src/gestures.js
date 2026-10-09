// Gesture recognition from MediaPipe's 21 hand landmarks.
// Input points are [x, y, z] in screen pixels (already mirrored like the video),
// so every measure below is a scale-free ratio.
//
//   0 wrist | 1-4 thumb | 5-8 index | 9-12 middle | 13-16 ring | 17-20 pinky
//   (MCP, PIP, DIP, TIP for each finger)

export const SENSITIVITY = {
  strict: { slack: -0.08, label: 'Strict' },
  standard: { slack: 0, label: 'Standard' },
  forgiving: { slack: 0.1, label: 'Forgiving' },
};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const remap = (v, a, b) => clamp01((v - a) / (b - a));

const FINGERS = { index: [5, 8], middle: [9, 12], ring: [13, 16], pinky: [17, 20] };

export function analyzeHand(lm, sensitivity = 'standard') {
  const slack = (SENSITIVITY[sensitivity] ?? SENSITIVITY.standard).slack;
  const wrist = lm[0];
  const size = dist(wrist, lm[9]) || 1; // wrist -> middle MCP: palm length
  const palmWidth = dist(lm[5], lm[17]) || size * 0.7;

  const ext = {};
  for (const [name, [mcp, tip]] of Object.entries(FINGERS)) {
    ext[name] = remap(dist(wrist, lm[tip]) / (dist(wrist, lm[mcp]) || 1), 1.15, 1.75);
  }
  ext.thumb = remap(dist(lm[4], lm[5]) / palmWidth, 0.55, 1.0);

  const four = (ext.index + ext.middle + ext.ring + ext.pinky) / 4;
  const openness = clamp01(four * 0.85 + ext.thumb * 0.15);
  const pinch = dist(lm[4], lm[8]) / size;
  const midPinch = dist(lm[4], lm[12]) / size;

  const palm = [0, 5, 9, 13, 17].reduce((acc, i) => [acc[0] + lm[i][0] / 5, acc[1] + lm[i][1] / 5], [0, 0]);
  const up = [lm[9][0] - wrist[0], lm[9][1] - wrist[1]];
  const roll = Math.atan2(up[0], -up[1]); // 0 = fingers up, + = twisted clockwise

  const on = 0.6 - slack;
  const off = 0.45 + slack;
  let pose = 'moving';
  if (Math.max(ext.index, ext.middle, ext.ring, ext.pinky) < 0.35 + slack) pose = 'fist';
  else if (pinch < 0.3 + slack && ext.middle > 0.25) pose = 'pinch';
  else if (ext.index > on && ext.middle > on && ext.ring < off && ext.pinky < off) pose = 'peace';
  else if (ext.index > on && ext.middle < off && ext.ring < off && ext.pinky < off) pose = 'point';
  else if (four > 0.75 - slack && ext.thumb > 0.35) pose = 'open';

  return { pose, ext, openness, pinch, midPinch, palm, size, roll, indexTip: lm[8], thumbTip: lm[4], landmarks: lm };
}

// Adds time-based behaviour on top of per-frame poses: debouncing, held
// gestures (peace -> next model) and the snap (thumb-middle click).
export class GestureTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.stable = 'none';
    this.candidate = 'none';
    this.candidateSince = 0;
    this.peaceFired = false;
    this.snapContactAt = -1;
    this.lastSnapAt = -Infinity;
    this.twoHandBase = null;
  }

  update(hands, now, sensitivity = 'standard') {
    const events = [];
    const analyses = hands.map((lm) => analyzeHand(lm, sensitivity));
    // Primary hand: the larger (closer) one.
    const primary = analyses.slice().sort((a, b) => b.size - a.size)[0] ?? null;
    const raw = primary ? primary.pose : 'none';

    if (raw !== this.candidate) {
      this.candidate = raw;
      this.candidateSince = now;
    }
    const holdMs = raw === 'none' ? 250 : 90;
    if (this.stable !== this.candidate && now - this.candidateSince >= holdMs) {
      this.stable = this.candidate;
      if (this.stable !== 'peace') this.peaceFired = false;
    }

    if (this.stable === 'peace' && !this.peaceFired && now - this.candidateSince >= 450) {
      this.peaceFired = true;
      events.push('next');
    }

    // Snap: thumb + middle touch with the middle finger loaded, then a fast release
    // that leaves the middle finger curled into the palm.
    if (primary) {
      const { midPinch, pinch, ext } = primary;
      if (midPinch < 0.32 && pinch > midPinch + 0.08 && ext.middle > 0.2 && ext.ring < 0.6) {
        this.snapContactAt = now;
      } else if (this.snapContactAt > 0 && now - this.snapContactAt < 380 && midPinch > 0.6 && ext.middle < 0.6) {
        if (now - this.lastSnapAt > 900) {
          events.push('snap');
          this.lastSnapAt = now;
        }
        this.snapContactAt = -1;
      } else if (now - this.snapContactAt >= 380) {
        this.snapContactAt = -1;
      }
    }

    // Two hands: zoom from the change in distance between palms.
    let zoom = null;
    if (analyses.length >= 2) {
      const d = Math.hypot(analyses[0].palm[0] - analyses[1].palm[0], analyses[0].palm[1] - analyses[1].palm[1]);
      if (!this.twoHandBase) this.twoHandBase = d;
      zoom = d / this.twoHandBase;
    } else {
      this.twoHandBase = null;
    }

    return { primary, analyses, pose: this.stable, events, zoom };
  }
}
