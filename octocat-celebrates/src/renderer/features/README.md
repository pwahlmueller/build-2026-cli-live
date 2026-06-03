# Octocat feature modules — ownership & rules

Phase 1 features extend the Octocat **without editing shared files**. Each feature
agent owns only the files listed below and may write only the listed CSS variables /
classes. The core (`../renderer.js`, `../index.html`, `../style.css`) is OFF LIMITS to
feature agents — it is set up in Phase 0 and provides everything you need.

## Plugin API (provided by core, `window.Octocat`)
- `Octocat.registerPlugin({ id, priority?, onEvent?(event, api), onIdle?(api) })`
- `event` = `{ type, config }` where `type` is one of `post-commit`, `post-merge`,
  `pre-push`, `post-checkout`, `post-rewrite`.
- `api` (restricted surface):
  - `api.addClass(cls)` / `api.removeClass(cls)` — toggle a class on `#octocat`
  - `api.setCssVar(name, value)` — set a CSS var on `#octocat`
  - `api.addOverlay(node)` — append a DOM node into `#overlay` (above the SVG)
  - `api.speak({ text, channel, priority, pitch, rate, voice })` — speech arbiter
  - `api.root` — the `#octocat` element (read-only; do not mutate shared SVG)

## Speech arbiter
- One utterance at a time. For a given `channel`, the **highest priority** request
  wins and others on that channel are dropped, so voices never overlap.
- Goblin uses `channel:'event'` with **high** priority; generic sound narration uses
  `channel:'event'` with **low** priority (it yields to goblin).

## CSS-variable contracts (defined in `../style.css`)
| Variable | Owner | Meaning |
|----------|-------|---------|
| `--octo-dur-breathe/bounce/spin/rocket/look/dizzy` | timing | animation durations |
| `--octo-opacity` | visibility | body opacity (0–1) |
| `--octo-outline` | visibility | a `drop-shadow(...)` filter used as outline (or `none`) |
| `--octo-shadow` | core | base drop shadow (do not override) |
| `--pupil-x` / `--pupil-y` | eyes | pupil offset (set via `api.setCssVar` on `#octocat`) |

## Ownership table
| Feature | Issue(s) | Allowed files | May write |
|---------|----------|---------------|-----------|
| goblin     | #44            | `goblin.js`, `goblin.css`     | own classes/overlay, `api.speak` (high prio) |
| sound      | #40            | `sound.js`                    | WebAudio, `api.speak` (low prio) |
| eyes       | #55, #42       | `eyes.js`                     | `--pupil-x`, `--pupil-y` only |
| visibility | #54, #50, #34  | `visibility.css`              | `--octo-opacity`, `--octo-outline` only |
| timing     | #56            | `timing.css`                  | `--octo-dur-*` only |

## Hard rules
- Do NOT edit `renderer.js`, `index.html`, `style.css`, `main.js`, `preload.js`.
- Do NOT write CSS variables/classes owned by another feature.
- Do NOT transform the pupils/eyes except via `--pupil-x/--pupil-y` (eyes feature only);
  core owns the blink animation.
- Register exactly one plugin per feature.
