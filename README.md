# Carom

Carom is a fast top-down paddle duel for the browser. Curve the ball by moving your paddle through contact, then use the two center obstacles to build sharp bank shots. Play against the reactive circuit opponent or share the keyboard for a local versus match. First to 11 wins, with a two-point lead.

## Run locally

```sh
npm ci
npm run dev
```

Open the address Vite prints. To create the self-contained static production site:

```sh
npm run build
```

The result is written to `dist/` and can be served from the root of any static web server. `npm run preview` serves that build locally.

## Controls

- Left paddle: `W` / `S`
- Right paddle in Versus: `↑` / `↓`
- In Solo, either pair moves the left paddle
- Menu: either movement pair, then `Enter` or `Space`
- Pause/resume: `P` or `Escape`
- Mute: `M`
- Mouse and touch: hover/tap menu items

Move while striking to add spin. A downward-moving paddle curves the ball clockwise; an upward-moving paddle curves it counter-clockwise. The amber bars are solid obstacles and reward deliberate ricochets.

## Quality checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`.
