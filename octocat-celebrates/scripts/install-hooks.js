#!/usr/bin/env node
/**
 * Installs git hooks that notify the running Octocat app of lifecycle events.
 * Each hook POSTs to the local Octocat server. Hooks are intentionally
 * non-blocking: a short timeout plus `|| true` so they NEVER fail a git command,
 * even if the Octocat app is not running.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.OCTOCAT_PORT || '4242';
const EVENTS = ['post-commit', 'post-merge', 'pre-push', 'post-checkout', 'post-rewrite'];
const MARKER = '# >>> octocat-celebrates hook >>>';
const END_MARKER = '# <<< octocat-celebrates hook <<<';

function gitHooksDir() {
  const dir = execSync('git rev-parse --git-path hooks', { encoding: 'utf8' }).trim();
  return path.resolve(dir);
}

function hookBody(event) {
  return [
    '#!/bin/sh',
    MARKER,
    `curl -s -m 1 -X POST "http://127.0.0.1:${PORT}/event" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"type":"${event}"}' >/dev/null 2>&1 || true`,
    END_MARKER,
    ''
  ].join('\n');
}

function install() {
  const hooksDir = gitHooksDir();
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  for (const event of EVENTS) {
    const file = path.join(hooksDir, event);
    const snippet = hookBody(event);

    if (fs.existsSync(file)) {
      let existing = fs.readFileSync(file, 'utf8');
      if (existing.includes(MARKER)) {
        console.log(`• ${event}: already installed, skipping`);
        continue;
      }
      // Append our notifier to an existing hook without clobbering it.
      if (!existing.endsWith('\n')) existing += '\n';
      const appended = snippet.split('\n').slice(2).join('\n'); // drop shebang line
      fs.writeFileSync(file, existing + '\n' + MARKER + '\n' + appended);
      console.log(`• ${event}: appended to existing hook`);
    } else {
      fs.writeFileSync(file, snippet);
      console.log(`• ${event}: created`);
    }
    fs.chmodSync(file, 0o755);
  }
  console.log(`\n✅ Octocat hooks installed (port ${PORT}). Start the app with: npm start`);
}

try {
  install();
} catch (err) {
  console.error(`Failed to install hooks: ${err.message}`);
  process.exit(1);
}
