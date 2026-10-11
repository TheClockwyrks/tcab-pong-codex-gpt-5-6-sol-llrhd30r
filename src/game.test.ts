import { describe, expect, it, vi } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_W,
  HOLD_TIME,
  SERVE_SPEED,
} from "./constants";
import { game, type CaromDebugApi, type CaromState } from "./game";

function setup() {
  let muted = false;
  const played: string[] = [];
  const api = {
    input: { register: vi.fn(), layout: () => null },
    audio: { define: vi.fn(), load: vi.fn() },
    diagnostics: { register: vi.fn() },
    assets: {},
    events: {},
    viewport: vi.fn(),
  } as unknown as InitApi<CaromState>;
  const [state, debug] = game.initialize(api) as [CaromState, CaromDebugApi];
  const update = {
    input: {
      value: () => 0,
      pressed: () => false,
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerSamples: () => [],
      pointerContacts: () => [],
      pointerPressed: () => false,
      pointerReleased: () => false,
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play: (cue: string) => played.push(cue),
      loop: vi.fn(),
      stop: vi.fn(),
      looping: () => false,
      setMuted: (v: boolean) => {
        muted = v;
      },
      muted: () => muted,
    },
    frame: vi.fn(),
    viewport: vi.fn(),
  } as unknown as UpdateApi;
  return { state, debug, update, played };
}

describe("Carom simulation", () => {
  it("initializes the complete title world and debug surface", () => {
    const { state, debug } = setup();
    expect(debug.version).toBe(1);
    expect(debug.snapshot(state)).toMatchObject({
      screen: "title",
      mode: "solo",
      score: { p1: 0, p2: 0 },
      ball: { x: FIELD_CX, y: FIELD_CY, held: true, holdTimer: HOLD_TIME },
    });
    expect(state.obstacles).toHaveLength(2);
  });

  it("serves toward the receiver when the hold expires", () => {
    const { state, debug, update } = setup();
    let next = debug.setScreen(state, "countdown");
    next = debug.setBallServeSign(next, -1);
    next = game.update(next, update, HOLD_TIME);
    expect(next.screen).toBe("playing");
    expect(next.ball?.held).toBe(false);
    expect(Math.hypot(next.ball?.vx ?? 0, next.ball?.vy ?? 0)).toBeCloseTo(
      SERVE_SPEED,
    );
    expect(next.ball?.vx).toBeLessThan(0);
    expect(next.ball?.vy).toBeLessThan(0);
  });

  it("scores, parks a new ball, and names the receiver", () => {
    const { state, debug, update, played } = setup();
    let next = debug.setScreen(state, "playing");
    next = debug.setBallHeld(next, false);
    next = debug.setBallPosition(next, FIELD_W + BALL_R + 1, FIELD_CY);
    next = debug.setBallVelocity(next, 100, 0);
    next = game.update(next, update, 0.01);
    expect(next.score).toEqual({ p1: 1, p2: 0 });
    expect(next.receiver).toBe("right");
    expect(next.screen).toBe("countdown");
    expect(next.ball).toMatchObject({ x: FIELD_CX, y: FIELD_CY, held: true });
    expect(played).toContain("score");
  });

  it("clears, restores, and rejects poses against an absent ball", () => {
    const { state, debug } = setup();
    const empty = debug.clearWorld(state);
    expect(debug.snapshot(empty).ball).toBeNull();
    expect(() => debug.setBallSpin(empty, 20)).toThrow(/no ball/i);
    const restored = debug.spawnBall(empty);
    expect(restored.ball?.held).toBe(true);
    expect(debug.spawnObstacle(restored, 0).obstacles).toHaveLength(1);
  });
});
