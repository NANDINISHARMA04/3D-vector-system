// GPU particle system: physics runs entirely on the GPU via WebGL2 transform
// feedback (ping-pong between two state buffers), rendering is additive point
// sprites. The CPU only uploads new target shapes when the model changes.

const UPDATE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aVel;
layout(location=2) in vec3 aTarget;
layout(location=3) in vec3 aExplode;
layout(location=4) in vec4 aScatter;   // xyz: dissolved home, w: per-particle random
layout(location=5) in float aPart;

uniform float uDt;
uniform float uTime;
uniform float uForm;       // 0 = dissolved cloud, 1 = formed model
uniform float uExplode;    // 0..1 exploded view amount
uniform float uGrabPart;   // part being pulled out (-1 none)
uniform vec3  uGrabOffset; // world offset for the grabbed part
uniform vec3  uHand;       // hand position in world space
uniform float uHandForce;  // repulsion strength (0 = off)

out vec3 vPos;
out vec3 vVel;

vec3 swirl(vec3 p, float t) {
  return vec3(
    sin(p.y * 1.7 + t * 0.6) + cos(p.z * 1.3 - t * 0.4),
    sin(p.z * 1.5 + t * 0.5) + cos(p.x * 1.1 + t * 0.3),
    sin(p.x * 1.9 - t * 0.45) + cos(p.y * 1.2 + t * 0.35));
}

void main() {
  float rnd = aScatter.w;
  vec3 target = aTarget + aExplode * uExplode;
  if (abs(aPart - uGrabPart) < 0.5) target += uGrabOffset;

  vec3 drift = swirl(aScatter.xyz * 0.8 + rnd * 3.0, uTime) * 0.18;
  vec3 dissolved = aScatter.xyz + drift;

  // Stagger arrival so the model "assembles" rather than popping in.
  float form = clamp(uForm * 1.6 - rnd * 0.6, 0.0, 1.0);
  form = form * form * (3.0 - 2.0 * form);
  vec3 goal = mix(dissolved, target, form);

  float k = mix(3.0, 26.0 + rnd * 18.0, form);   // spring stiffness
  float c = 2.0 * sqrt(k) * 0.82;                 // ~critically damped
  vec3 acc = (goal - aPos) * k - aVel * c;

  // Gentle shimmer when formed, curl-ish flow when dissolved.
  acc += swirl(aPos * 2.3 + rnd, uTime * 1.3) * mix(0.9, 0.05, form);

  // Hand pushes particles away.
  vec3 d = aPos - uHand;
  float r = length(d);
  float radius = 0.45;
  if (uHandForce > 0.0 && r < radius && r > 1e-4) {
    acc += normalize(d) * (radius - r) / radius * 60.0 * uHandForce;
  }

  vec3 vel = aVel + acc * uDt;
  vPos = aPos + vel * uDt;
  vVel = vel;
}`;

const UPDATE_FS = `#version 300 es
precision highp float;
out vec4 o;
void main() { o = vec4(0.0); }`;

const RENDER_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aCol;
layout(location=2) in float aPart;
layout(location=3) in vec4 aScatter;

uniform mat4 uView;
uniform mat4 uProj;
uniform float uSize;
uniform float uHover;     // hovered/selected part (-1 none)
uniform float uFocus;     // 0..1 how strongly to dim other parts
uniform float uClip;      // 1 = section cut (hide z > 0 half)
uniform float uForm;

out vec3 vCol;
out float vGlow;

void main() {
  float rnd = aScatter.w;
  vec4 vp = uView * vec4(aPos, 1.0);
  gl_Position = uProj * vp;
  bool hot = uHover >= 0.0 && abs(aPart - uHover) < 0.5;
  float dim = (uHover >= 0.0 && !hot) ? mix(1.0, 0.3, uFocus) : 1.0;
  float boost = hot ? 1.0 + 0.55 * uFocus : 1.0;
  vec3 col = mix(vec3(0.75, 0.85, 1.0), aCol, clamp(uForm * 1.3, 0.0, 1.0));
  vCol = col * dim * boost;
  vGlow = hot ? uFocus : 0.0;
  float size = uSize * (0.55 + 0.9 * rnd) * (hot ? 1.35 : 1.0);
  gl_PointSize = clamp(size / max(0.05, -vp.z), 1.0, 64.0);
  if (uClip > 0.5 && aPos.z > 0.0 && uForm > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const RENDER_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vGlow;
uniform float uGain;
out vec4 o;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  float a = exp(-d * 3.2) * uGain;
  o = vec4(vCol * a, a * 0.85);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(s)}`);
  }
  return s;
}

function program(gl, vs, fs, varyings) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Link failed: ${gl.getProgramInfoLog(p)}`);
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const { name } = gl.getActiveUniform(p, i);
    uniforms[name] = gl.getUniformLocation(p, name);
  }
  return { p, u: uniforms };
}

export class ParticleSystem {
  constructor(canvas, count) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.canvas = canvas;
    this.count = count;
    this.update = program(gl, UPDATE_VS, UPDATE_FS, ['vPos', 'vVel']);
    this.render = program(gl, RENDER_VS, RENDER_FS);
    this.cur = 0;
    this.#allocate();
  }

  #buffer(data, usage) {
    const { gl } = this;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return b;
  }

  #allocate() {
    const { gl, count: n } = this;
    // Dissolved home positions: a wide shell around the scene + random seed.
    const scatter = new Float32Array(n * 4);
    const state = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const z = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.pow(Math.random(), 0.6) * 1.8;
      const s = Math.sqrt(1 - z * z);
      scatter.set([s * Math.cos(t) * r * 1.5, z * r * 0.8, s * Math.sin(t) * r], i * 4);
      scatter[i * 4 + 3] = Math.random();
      state.set(scatter.subarray(i * 4, i * 4 + 3), i * 6);
    }
    this.scatterBuf = this.#buffer(scatter, gl.STATIC_DRAW);
    this.state = [this.#buffer(state, gl.DYNAMIC_COPY), this.#buffer(state, gl.DYNAMIC_COPY)];
    this.targetBuf = this.#buffer(new Float32Array(n * 3), gl.STATIC_DRAW);
    this.explodeBuf = this.#buffer(new Float32Array(n * 3), gl.STATIC_DRAW);
    this.colorBuf = this.#buffer(new Float32Array(n * 3).fill(0.8), gl.STATIC_DRAW);
    this.partBuf = this.#buffer(new Float32Array(n).fill(-1), gl.STATIC_DRAW);

    const attr = (loc, buf, size, stride = 0, offset = 0) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    };

    this.updateVao = [0, 1].map((i) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      attr(0, this.state[i], 3, 24, 0);
      attr(1, this.state[i], 3, 24, 12);
      attr(2, this.targetBuf, 3);
      attr(3, this.explodeBuf, 3);
      attr(4, this.scatterBuf, 4);
      attr(5, this.partBuf, 1);
      return vao;
    });
    this.renderVao = [0, 1].map((i) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      attr(0, this.state[i], 3, 24, 0);
      attr(1, this.colorBuf, 3);
      attr(2, this.partBuf, 1);
      attr(3, this.scatterBuf, 4);
      return vao;
    });
    gl.bindVertexArray(null);

    this.tf = [0, 1].map((i) => {
      const tf = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.state[i]);
      return tf;
    });
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
  }

  setModel(sample) {
    const { gl } = this;
    const upload = (buf, data) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    };
    upload(this.targetBuf, sample.positions);
    upload(this.explodeBuf, sample.explode);
    upload(this.colorBuf, sample.colors);
    upload(this.partBuf, sample.partIds);
  }

  resize(width, height, dpr) {
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
  }

  step(dt, time, s) {
    const { gl, update } = this;
    const u = update.u;
    gl.useProgram(update.p);
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uForm, s.form);
    gl.uniform1f(u.uExplode, s.explode);
    gl.uniform1f(u.uGrabPart, s.grabPart);
    gl.uniform3fv(u.uGrabOffset, s.grabOffset);
    gl.uniform3fv(u.uHand, s.hand);
    gl.uniform1f(u.uHandForce, s.handForce);

    const next = 1 - this.cur;
    gl.bindVertexArray(this.updateVao[this.cur]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tf[next]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);
    this.cur = next;
  }

  draw(view, proj, s) {
    const { gl, render } = this;
    const u = render.u;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
    gl.useProgram(render.p);
    gl.uniformMatrix4fv(u.uView, false, view);
    gl.uniformMatrix4fv(u.uProj, false, proj);
    // Keep perceived density roughly constant across particle budgets.
    const density = Math.sqrt(200000 / this.count);
    gl.uniform1f(u.uSize, 0.02 * this.canvas.height * 0.5 * Math.min(density, 2.5));
    gl.uniform1f(u.uGain, Math.min(0.85, 0.42 * density));
    gl.uniform1f(u.uHover, s.hover);
    gl.uniform1f(u.uFocus, s.focus);
    gl.uniform1f(u.uClip, s.clip ? 1 : 0);
    gl.uniform1f(u.uForm, s.form);
    gl.bindVertexArray(this.renderVao[this.cur]);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.bindVertexArray(null);
  }
}
