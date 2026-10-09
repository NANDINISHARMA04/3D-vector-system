// 2D overlay: hand skeleton, pose ring and pointer cursor.

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export const POSE_COLORS = {
  open: '#ffc94a',
  moving: '#ffc94a',
  fist: '#ff6b6b',
  point: '#7fd1ff',
  pinch: '#ff9fd8',
  peace: '#b18cff',
  none: '#ffffff',
};

export class Overlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(w, h, dpr) {
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
  }

  draw(analyses, { pose, holdProgress = 0, grabbing = false, time = 0 }) {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    analyses.forEach((a, i) => {
      const lm = a.landmarks;
      const p = i === 0 ? pose : a.pose;
      const color = POSE_COLORS[p] ?? '#ffffff';

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      for (const [s, e] of BONES) {
        ctx.moveTo(lm[s][0], lm[s][1]);
        ctx.lineTo(lm[e][0], lm[e][1]);
      }
      ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const q of lm) {
        ctx.beginPath();
        ctx.arc(q[0], q[1], 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pose ring around the palm.
      const r = a.size * 1.2;
      const pulse = 1 + Math.sin(time * 4) * 0.015;
      // Centre the ring between the palm and the fingers.
      const cx = a.palm[0] + (lm[9][0] - lm[0][0]) * 0.25;
      const cy = a.palm[1] + (lm[9][1] - lm[0][1]) * 0.25;
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.stroke();
      if (i === 0 && holdProgress > 0) {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (i === 0 && (p === 'point' || p === 'pinch')) {
        const t = p === 'pinch' ? [(a.indexTip[0] + a.thumbTip[0]) / 2, (a.indexTip[1] + a.thumbTip[1]) / 2] : a.indexTip;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(t[0], t[1], grabbing ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }
}
