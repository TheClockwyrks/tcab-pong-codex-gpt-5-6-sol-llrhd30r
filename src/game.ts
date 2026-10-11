import type { Game, InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
}
type R = DeepReadonly<CaromState>;
export interface Snapshot extends Omit<CaromState, "ball"> {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
}
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: R): CaromState;
  spawnBall(s: R): CaromState;
  spawnObstacle(s: R, index: number): CaromState;
  reset(s: R): CaromState;
  reconcile(s: R): CaromState;
  setScreen(s: R, v: Screen): CaromState;
  setMode(s: R, v: Mode): CaromState;
  setMenuIndex(s: R, v: number): CaromState;
  setTitleIndex(s: R, v: number): CaromState;
  setResumeScreen(s: R, v: "countdown" | "playing"): CaromState;
  setScore(s: R, p1: number, p2: number): CaromState;
  setWinner(s: R, v: Side | null): CaromState;
  setReceiver(s: R, v: Side): CaromState;
  setPaddleCy(s: R, side: Side, v: number): CaromState;
  setPaddleVy(s: R, side: Side, v: number): CaromState;
  setPaddleDriven(s: R, side: Side, v: boolean): CaromState;
  setBallPosition(s: R, x: number, y: number): CaromState;
  setBallVelocity(s: R, x: number, y: number): CaromState;
  setBallSpin(s: R, v: number): CaromState;
  setBallHeld(s: R, v: boolean): CaromState;
  setBallHoldTimer(s: R, v: number): CaromState;
  setBallServeSign(s: R, v: 1 | -1): CaromState;
  drawBallServeSign(s: R): CaromState;
  setAiTracking(s: R, v: boolean): CaromState;
  setAiMovement(s: R, v: boolean): CaromState;
  setMuted(s: R, v: boolean): CaromState;
  snapshot(s: R): Snapshot;
  menuItemRect(s: R, index: number): MenuRect | null;
}
export const BACKGROUND = "#07111d";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const serveSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const newPaddle = (): PaddleState => ({
  cy: C.FIELD_CY,
  vy: 0,
  driven: false,
  drivenVy: 0,
});
const newBall = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: serveSign(),
  trail: [],
});
const newObstacles = (): ObstacleState[] =>
  C.OBSTACLE_CENTERS.map((p, index) => ({ index, cx: p.x, cy: p.y }));
const clone = (s: R): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((v) => ({ ...v })) }
    : null,
  obstacles: s.obstacles.map((v) => ({ ...v })),
});
const opening = (muted: boolean): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: 0,
  titleIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: { left: newPaddle(), right: newPaddle() },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: newBall(),
  obstacles: newObstacles(),
  simTime: 0,
  muted,
});
const start = (s: R, mode: Mode): CaromState => ({
  ...clone(s),
  mode,
  screen: "countdown",
  resumeScreen: "playing",
  menuIndex: 0,
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: newBall(),
  paddles: {
    left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
  },
});
const title = (s: R): CaromState => ({
  ...opening(s.muted),
  titleIndex: s.titleIndex,
  menuIndex: s.titleIndex,
  simTime: s.simTime,
});
const count = (x: Screen) =>
  x === "title"
    ? 3
    : x === "howto"
      ? 1
      : x === "paused"
        ? 3
        : x === "matchover"
          ? 2
          : 0;
const rect = (x: Screen, i: number): MenuRect | null => {
  if (i < 0 || i >= count(x)) return null;
  const w = x === "howto" ? 300 : 350,
    y = x === "title" ? 390 : x === "howto" ? 596 : x === "paused" ? 330 : 430;
  return { x: C.FIELD_CX - w / 2, y: y + i * 72, w, h: 58 };
};
const inside = (r: MenuRect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function integrate(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const raw = p.cy + vy * dt,
    cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt > 0 && cy !== raw ? (cy - p.cy) / dt : vy };
}
function paddles(s: R, a: UpdateApi, dt: number): CaromState["paddles"] {
  const axis = (u: string, d: string) =>
    (a.input.value(d) - a.input.value(u)) * C.PADDLE_SPEED;
  const lv = s.paddles.left.driven
    ? s.paddles.left.drivenVy
    : s.mode === "solo"
      ? ((a.input.value("p1-down") || a.input.value("p2-down")) -
          (a.input.value("p1-up") || a.input.value("p2-up"))) *
        C.PADDLE_SPEED
      : axis("p1-up", "p1-down");
  let rv = 0;
  if (s.paddles.right.driven) rv = s.paddles.right.drivenVy;
  else if (s.mode === "versus") rv = axis("p2-up", "p2-down");
  else if (s.ai.movement) {
    let target = C.AI_HOME_Y,
      dead = C.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * C.AI_REACT;
      dead = C.AI_DEADZONE;
    }
    const d = target - s.paddles.right.cy;
    rv =
      Math.abs(d) <= dead || dt <= 0
        ? 0
        : Math.sign(d) * Math.min(C.AI_SPEED, Math.abs(d) / dt);
  }
  return {
    left: integrate(s.paddles.left, lv, dt),
    right: integrate(s.paddles.right, rv, dt),
  };
}
type Face = "left" | "right" | "top" | "bottom";
function hit(
  b: BallState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Face | null {
  if (!(
    b.x > x0 - C.BALL_R &&
    b.x < x1 + C.BALL_R &&
    b.y > y0 - C.BALL_R &&
    b.y < y1 + C.BALL_R
  ))
    return null;
  const d = [
    b.x - x0 + C.BALL_R,
    x1 + C.BALL_R - b.x,
    b.y - y0 + C.BALL_R,
    y1 + C.BALL_R - b.y,
  ];
  return (["left", "right", "top", "bottom"] as const)[
    d.indexOf(Math.min(...d))
  ];
}
function reflect(
  b: BallState,
  f: Face,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): BallState {
  if (f === "left")
    return { ...b, x: x0 - C.BALL_R, vx: b.vx > 0 ? -b.vx : b.vx };
  if (f === "right")
    return { ...b, x: x1 + C.BALL_R, vx: b.vx < 0 ? -b.vx : b.vx };
  if (f === "top")
    return { ...b, y: y0 - C.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy };
  return { ...b, y: y1 + C.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy };
}
function paddleHit(
  b: BallState,
  p: DeepReadonly<PaddleState>,
  side: Side,
): BallState {
  const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP),
    angle = clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
  return {
    ...b,
    x: side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R,
    vx: (side === "left" ? 1 : -1) * speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    spin: clamp(
      b.spin + p.vy * C.SPIN_FROM_PADDLE,
      -C.SPIN_CLAMP,
      C.SPIN_CLAMP,
    ),
  };
}
type Events = { wall: boolean; paddle: boolean; obstacle: boolean };
function moveBall(
  src: DeepReadonly<BallState>,
  s: R,
  dt: number,
): { ball: BallState; events: Events } {
  let b: BallState = { ...src, trail: src.trail.map((v) => ({ ...v })) };
  const events = { wall: false, paddle: false, obstacle: false },
    n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP)),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed) {
      const q = (b.spin / speed) * h,
        co = Math.cos(q),
        si = Math.sin(q),
        vx = b.vx * co - b.vy * si,
        vy = b.vx * si + b.vy * co;
      b = { ...b, vx, vy };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / C.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: C.BALL_R, vy: -b.vy };
      events.wall = true;
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b = { ...b, y: C.FIELD_H - C.BALL_R, vy: -b.vy };
      events.wall = true;
    }
    for (const [side, p, x0, x1] of [
      ["left", s.paddles.left, C.P1_X0, C.P1_X1],
      ["right", s.paddles.right, C.P2_X0, C.P2_X1],
    ] as const) {
      const f = hit(b, x0, p.cy - C.PADDLE_HALF, x1, p.cy + C.PADDLE_HALF);
      if (f) {
        if (f === "left" || f === "right") {
          b = paddleHit(b, p, side);
          events.paddle = true;
        } else {
          b = reflect(b, f, x0, p.cy - C.PADDLE_HALF, x1, p.cy + C.PADDLE_HALF);
          events.wall = true;
        }
      }
    }
    for (const o of s.obstacles) {
      const x0 = o.cx - C.OBSTACLE_HW,
        y0 = o.cy - C.OBSTACLE_HH,
        x1 = o.cx + C.OBSTACLE_HW,
        y1 = o.cy + C.OBSTACLE_HH,
        f = hit(b, x0, y0, x1, y1);
      if (f) {
        b = reflect(b, f, x0, y0, x1, y1);
        events.obstacle = true;
      }
    }
  }
  return { ball: b, events };
}
function confirm(s: R): CaromState {
  if (s.screen === "title") {
    const b = { ...clone(s), titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(b, "solo")
      : s.menuIndex === 1
        ? start(b, "versus")
        : { ...b, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...clone(s), screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return clone(s);
}
function input(s: R, a: UpdateApi): CaromState {
  let n = clone(s);
  if (s.screen === "countdown" || s.screen === "playing") {
    if (a.input.pressed("pause"))
      n = { ...n, resumeScreen: s.screen, screen: "paused", menuIndex: 0 };
    return n;
  }
  if (
    s.screen === "paused" &&
    (a.input.pressed("pause") || a.input.pressed("back"))
  )
    return { ...n, screen: s.resumeScreen };
  if (
    (s.screen === "howto" && a.input.pressed("back")) ||
    (s.screen === "matchover" && a.input.pressed("back"))
  )
    return title(s);
  const c = count(s.screen);
  if (!c) return n;
  const up = a.input.pressed("p1-up") || a.input.pressed("p2-up"),
    down = a.input.pressed("p1-down") || a.input.pressed("p2-down");
  if (up) n = { ...n, menuIndex: (n.menuIndex - 1 + c) % c };
  else if (down) n = { ...n, menuIndex: (n.menuIndex + 1) % c };
  else if (a.input.pressed("confirm")) return confirm(n);
  let pressed: number | null = null;
  for (const p of a.input.pointerSamples()) {
    let at: number | null = null;
    for (let i = 0; i < c; i++) {
      const r = rect(s.screen, i);
      if (r && inside(r, p.x, p.y)) {
        at = i;
        break;
      }
    }
    if (at !== null) n = { ...n, menuIndex: at };
    if (p.type === "down") pressed = at;
    if (p.type === "up" && at !== null && at === pressed) return confirm(n);
  }
  const p = a.input.pointer();
  for (let i = 0; i < c; i++) {
    const r = rect(s.screen, i);
    if (r && inside(r, p.x, p.y)) n = { ...n, menuIndex: i };
  }
  return n;
}
const requireBall = (s: R) => {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return s.ball;
};
const ballSet = (
  s: R,
  f: (b: DeepReadonly<BallState>) => BallState,
): CaromState => ({ ...clone(s), ball: f(requireBall(s)) });
const paddleSet = (
  s: R,
  side: Side,
  f: (p: DeepReadonly<PaddleState>) => PaddleState,
): CaromState => {
  const n = clone(s);
  return { ...n, paddles: { ...n.paddles, [side]: f(s.paddles[side]) } };
};
const debug = (): CaromDebugApi => ({
  version: C.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...clone(s), ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...clone(s), ball: newBall() }),
  spawnObstacle: (s, index) => {
    const p = C.OBSTACLE_CENTERS[index];
    if (!p) throw new RangeError(`Carom: obstacle ${index} does not exist`);
    return {
      ...clone(s),
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index).map((o) => ({ ...o })),
        { index, cx: p.x, cy: p.y },
      ].sort((a, b) => a.index - b.index),
    };
  },
  reset: (s) => opening(s.muted),
  reconcile: clone,
  setScreen: (s, screen) => ({ ...clone(s), screen }),
  setMode: (s, mode) => ({ ...clone(s), mode }),
  setMenuIndex: (s, menuIndex) => ({ ...clone(s), menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...clone(s), titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...clone(s), resumeScreen }),
  setScore: (s, p1, p2) => ({ ...clone(s), score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...clone(s), winner }),
  setReceiver: (s, receiver) => ({ ...clone(s), receiver }),
  setPaddleCy: (s, x, cy) => paddleSet(s, x, (p) => ({ ...p, cy })),
  setPaddleVy: (s, x, drivenVy) => paddleSet(s, x, (p) => ({ ...p, drivenVy })),
  setPaddleDriven: (s, x, driven) => paddleSet(s, x, (p) => ({ ...p, driven })),
  setBallPosition: (s, x, y) =>
    ballSet(s, (b) => ({ ...b, x, y, trail: b.trail.map((v) => ({ ...v })) })),
  setBallVelocity: (s, vx, vy) =>
    ballSet(s, (b) => ({
      ...b,
      vx,
      vy,
      trail: b.trail.map((v) => ({ ...v })),
    })),
  setBallSpin: (s, spin) =>
    ballSet(s, (b) => ({ ...b, spin, trail: b.trail.map((v) => ({ ...v })) })),
  setBallHeld: (s, held) =>
    ballSet(s, (b) => ({ ...b, held, trail: b.trail.map((v) => ({ ...v })) })),
  setBallHoldTimer: (s, holdTimer) =>
    ballSet(s, (b) => ({
      ...b,
      holdTimer,
      trail: b.trail.map((v) => ({ ...v })),
    })),
  setBallServeSign: (s, serveSign) =>
    ballSet(s, (b) => ({
      ...b,
      serveSign,
      trail: b.trail.map((v) => ({ ...v })),
    })),
  drawBallServeSign: (s) =>
    ballSet(s, (b) => ({
      ...b,
      serveSign: serveSign(),
      trail: b.trail.map((v) => ({ ...v })),
    })),
  setAiTracking: (s, tracking) => ({ ...clone(s), ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...clone(s), ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...clone(s), muted }),
  snapshot: (s) => ({
    ...clone(s),
    version: C.CAROM_DEBUG_VERSION,
    ball: s.ball
      ? {
          ...s.ball,
          speed: Math.hypot(s.ball.vx, s.ball.vy),
          trail: s.ball.trail.map((v) => ({ ...v })),
        }
      : null,
  }),
  menuItemRect: (s, i) => rect(s.screen, i),
});

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>) {
    for (const a of C.ACTIONS)
      api.input.register(a, { keys: [...C.BINDINGS[a]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "square",
      freq: 620,
      freqTo: 880,
      gain: 0.12,
      durationMs: 55,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "triangle",
      freq: 300,
      freqTo: 220,
      gain: 0.1,
      durationMs: 45,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 410,
      freqTo: 300,
      gain: 0.09,
      durationMs: 65,
    });
    api.audio.define(C.CUES.score, {
      wave: "square",
      freq: 240,
      freqTo: 720,
      gain: 0.12,
      durationMs: 180,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1}-${s.score.p2}`);
    api.diagnostics.register("ball pos", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0,
    );
    api.diagnostics.register("ball spin", (s) => s.ball?.spin ?? 0);
    api.diagnostics.register(
      "left paddle",
      (s) => `${s.paddles.left.cy.toFixed(1)}, ${s.paddles.left.vy.toFixed(1)}`,
    );
    api.diagnostics.register(
      "right paddle",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)}, ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [opening(false), debug()];
  },
  update(state, api, dt) {
    let n = { ...input(state, api), simTime: state.simTime + dt };
    if (api.input.pressed("mute")) {
      const muted = !api.audio.muted();
      api.audio.setMuted(muted);
      n = { ...n, muted };
    } else if (n.muted !== api.audio.muted()) api.audio.setMuted(n.muted);
    n = { ...n, muted: api.audio.muted() };
    if (n.screen !== "countdown" && n.screen !== "playing") return n;
    n = { ...n, paddles: paddles(n, api, dt) };
    if (!n.ball) return n;
    let b: BallState = {
      ...n.ball,
      trail: n.ball.trail.map((v) => ({ ...v })),
    };
    if (n.screen === "countdown") {
      const t = b.holdTimer - dt;
      if (t <= 0) {
        const d = n.receiver === "left" ? -1 : 1;
        b = {
          ...b,
          held: false,
          holdTimer: 0,
          vx: d * C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
          vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          trail: [],
        };
        n = { ...n, screen: "playing" };
      } else b = { ...b, x: C.FIELD_CX, y: C.FIELD_CY, holdTimer: t };
    } else if (!b.held) {
      const z = moveBall(b, n, dt);
      b = z.ball;
      if (z.events.wall) api.audio.play(C.CUES.wallBounce);
      if (z.events.paddle) api.audio.play(C.CUES.paddleHit);
      if (z.events.obstacle) api.audio.play(C.CUES.obstacleBounce);
      let scorer: Side | null = null;
      if (b.x - C.BALL_R > C.FIELD_W) scorer = "left";
      else if (b.x + C.BALL_R < 0) scorer = "right";
      if (scorer) {
        api.audio.play(C.CUES.score);
        const score = {
            p1: n.score.p1 + (scorer === "left" ? 1 : 0),
            p2: n.score.p2 + (scorer === "right" ? 1 : 0),
          },
          won =
            scorer === "left"
              ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
              : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
        n = {
          ...n,
          score,
          receiver: scorer === "left" ? "right" : "left",
          winner: won ? scorer : null,
          screen: won ? "matchover" : "countdown",
          menuIndex: won ? 0 : n.menuIndex,
        };
        if (!won) b = newBall();
      }
    }
    if (n.screen === "countdown" || n.screen === "playing")
      b = {
        ...b,
        trail: [
          ...b.trail.filter((v) => v.t >= n.simTime - C.TRAIL_TIME),
          { x: b.x, y: b.y, t: n.simTime },
        ],
      };
    return { ...n, ball: b };
  },
  render(s, a) {
    draw(s, a.ctx);
  },
};

function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function label(
  c: CanvasRenderingContext2D,
  v: string,
  x: number,
  y: number,
  size: number,
  color = "#e9f6ff",
  align: CanvasTextAlign = "center",
) {
  c.fillStyle = color;
  c.font = `700 ${size}px ui-monospace, monospace`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(v, x, y);
}
function arena(s: R, c: CanvasRenderingContext2D, dim = false) {
  c.fillStyle = BACKGROUND;
  c.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  c.strokeStyle = "#17324a";
  c.lineWidth = 2;
  c.setLineDash([12, 18]);
  c.beginPath();
  c.moveTo(C.FIELD_CX, 28);
  c.lineTo(C.FIELD_CX, C.FIELD_H - 28);
  c.stroke();
  c.setLineDash([]);
  for (const o of s.obstacles) {
    c.shadowBlur = 16;
    c.shadowColor = "#ffb547";
    box(
      c,
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_HW * 2,
      C.OBSTACLE_HH * 2,
      10,
      "#ffb547",
    );
  }
  c.shadowColor = "#42e8e0";
  box(
    c,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_HALF * 2,
    8,
    "#42e8e0",
  );
  c.shadowColor = "#ff4f9a";
  box(
    c,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_HALF * 2,
    8,
    "#ff4f9a",
  );
  if (s.ball) {
    for (let i = 0; i < s.ball.trail.length; i++) {
      const p = s.ball.trail[i];
      c.globalAlpha = ((i + 1) / s.ball.trail.length) * 0.45;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(
        p.x,
        p.y,
        (C.BALL_R * (i + 1)) / s.ball.trail.length,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.globalAlpha = 1;
    c.shadowColor = "#fff";
    c.shadowBlur = 20;
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(s.ball.x, s.ball.y, C.BALL_R, 0, Math.PI * 2);
    c.fill();
  }
  c.shadowBlur = 0;
  label(c, String(s.score.p1), 520, 58, 44, "#42e8e0");
  label(c, String(s.score.p2), 760, 58, 44, "#ff4f9a");
  label(
    c,
    s.mode === "solo" ? "SOLO // HUMAN vs CIRCUIT" : "VERSUS // LOCAL DUEL",
    C.FIELD_CX,
    30,
    16,
    "#7895aa",
  );
  if (s.screen === "countdown" && s.ball)
    label(
      c,
      String(Math.max(1, Math.ceil(s.ball.holdTimer * 3))),
      C.FIELD_CX,
      C.FIELD_CY - 74,
      52,
      "#ffcf66",
    );
  if (dim) {
    c.fillStyle = "rgba(3,9,16,.74)";
    c.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  }
}
function menu(s: R, c: CanvasRenderingContext2D, items: readonly string[]) {
  items.forEach((v, i) => {
    const r = rect(s.screen, i);
    if (!r) return;
    if (i === s.menuIndex) {
      box(c, r.x, r.y, r.w, r.h, 12, "#173a50");
      c.strokeStyle = "#42e8e0";
      c.lineWidth = 2;
      c.strokeRect(r.x, r.y, r.w, r.h);
    }
    label(
      c,
      v,
      C.FIELD_CX,
      r.y + r.h / 2,
      24,
      i === s.menuIndex ? "#fff" : "#7895aa",
    );
  });
}
function draw(s: R, c: CanvasRenderingContext2D) {
  c.save();
  if (s.screen === "title") {
    arena(s, c, true);
    label(c, C.TITLE_TEXT, C.FIELD_CX, 180, 100);
    label(c, "SPIN THE ANGLE. OWN THE RALLY.", C.FIELD_CX, 260, 18, "#42e8e0");
    menu(s, c, C.TITLE_ITEMS);
  } else if (s.screen === "howto") {
    arena(s, c, true);
    label(c, "HOW TO PLAY", C.FIELD_CX, 92, 46);
    label(c, "W / S     LEFT PADDLE", 330, 205, 22, "#42e8e0");
    label(c, "↑ / ↓     RIGHT PADDLE", 930, 205, 22, "#ff4f9a");
    label(
      c,
      "Move as you strike to bend the ball with spin.",
      C.FIELD_CX,
      330,
      22,
    );
    label(
      c,
      "Bank shots off amber obstacles. First to 11, win by 2.",
      C.FIELD_CX,
      378,
      19,
      "#b3c8d6",
    );
    label(c, "P / ESC  PAUSE     M  MUTE", C.FIELD_CX, 458, 18, "#7895aa");
    menu(s, c, ["BACK"]);
  } else {
    arena(s, c, s.screen === "paused" || s.screen === "matchover");
    if (s.screen === "paused") {
      label(c, "PAUSED", C.FIELD_CX, 220, 52);
      menu(s, c, C.PAUSE_ITEMS);
    }
    if (s.screen === "matchover") {
      label(
        c,
        s.winner === "left" ? "LEFT SIDE WINS" : "RIGHT SIDE WINS",
        C.FIELD_CX,
        235,
        46,
        s.winner === "left" ? "#42e8e0" : "#ff4f9a",
      );
      label(c, `${s.score.p1}  —  ${s.score.p2}`, C.FIELD_CX, 310, 36);
      menu(s, c, C.MATCHOVER_ITEMS);
    }
  }
  if (s.muted) label(c, "MUTED", C.FIELD_W - 28, 24, 14, "#7895aa", "right");
  c.restore();
}
