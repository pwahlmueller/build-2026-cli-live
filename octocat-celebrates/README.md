# 🐙 Octocat Celebrates

An always-on-top desktop Octocat that lives in the corner of your screen and
**celebrates your git lifecycle events** in real time. Commit, merge, push,
checkout, or rewrite history and the Octocat reacts with animations, a speech
bubble, and confetti.

Built for the Build 2026 *"From CLI to PR"* live demo.

## How it works

```
 git commit ──▶ .git/hooks/post-commit ──curl──▶ http://127.0.0.1:4242/event
                                                          │
                                                  Electron main process
                                                          │ IPC
                                                  Octocat renderer 🎉
```

- An **Electron** app shows a frameless, transparent, always-on-top Octocat.
- The app runs a tiny local HTTP server on `127.0.0.1:4242`.
- Installed **git hooks** `curl` that server when events fire. Hooks are
  non-blocking (1s timeout, `|| true`) so they **never** slow down or fail a git
  command, even when the app is closed.

## Events & celebrations

| Git event       | Octocat does            | Says                  |
|-----------------|-------------------------|-----------------------|
| `post-commit`   | bounce + confetti       | "Nice commit! ✅"      |
| `post-merge`    | party spin + confetti   | "Merged! 🎉"          |
| `pre-push`      | rocket lift-off         | "Shipping it! 🚀"     |
| `post-checkout` | look around             | "New branch? 👀"      |
| `post-rewrite`  | dizzy wobble            | "History rewritten 🌀" |

## Quick start

```bash
cd octocat-celebrates
npm install          # install Electron
npm start            # launch the always-on-top Octocat
npm run install-hooks   # wire up git hooks in THIS repo
```

Now make a commit and watch the Octocat celebrate.

```bash
git commit -am "hello octocat"
```

### Remove the hooks

```bash
npm run uninstall-hooks
```

This only strips Octocat's block from each hook. If you had other logic in a
hook, it's preserved; hooks that contained only Octocat are deleted.

## Configuration

- **Port** — set `OCTOCAT_PORT` before starting the app *and* installing hooks:
  ```bash
  OCTOCAT_PORT=5000 npm start
  OCTOCAT_PORT=5000 npm run install-hooks
  ```

## Tips

- Drag the Octocat anywhere — the whole window is draggable.
- Hover and click the **×** (top-right) to close.
- The server is bound to `127.0.0.1` only; nothing is exposed to the network.

## Project layout

```
octocat-celebrates/
  src/
    main.js              # Electron window + HTTP event server + IPC
    preload.js           # secure IPC bridge
    renderer/            # Octocat UI + animations
  scripts/
    install-hooks.js     # wire up .git/hooks/*
    uninstall-hooks.js   # remove them cleanly
```

## Demo
Live at Build 2026 🐙
