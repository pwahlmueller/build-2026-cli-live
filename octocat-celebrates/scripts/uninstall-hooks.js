#!/usr/bin/env node
/**
 * Removes the Octocat notifier from git hooks. If a hook contained ONLY our
 * notifier, the file is deleted; otherwise only our block is stripped out.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EVENTS = ['post-commit', 'post-merge', 'pre-push', 'post-checkout', 'post-rewrite'];
const MARKER = '# >>> octocat-celebrates hook >>>';
const END_MARKER = '# <<< octocat-celebrates hook <<<';

function gitHooksDir() {
  const dir = execSync('git rev-parse --git-path hooks', { encoding: 'utf8' }).trim();
  return path.resolve(dir);
}

function stripBlock(content) {
  const lines = content.split('\n');
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (line.trim() === MARKER) { skipping = true; continue; }
    if (line.trim() === END_MARKER) { skipping = false; continue; }
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

function uninstall() {
  const hooksDir = gitHooksDir();
  for (const event of EVENTS) {
    const file = path.join(hooksDir, event);
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(MARKER)) {
      console.log(`• ${event}: no octocat hook found, leaving untouched`);
      continue;
    }

    const stripped = stripBlock(content).replace(/\n{3,}/g, '\n\n').trim();
    const meaningful = stripped.replace(/^#!.*$/m, '').trim();

    if (meaningful === '') {
      fs.unlinkSync(file);
      console.log(`• ${event}: removed`);
    } else {
      fs.writeFileSync(file, stripped + '\n');
      fs.chmodSync(file, 0o755);
      console.log(`• ${event}: octocat block stripped, kept rest`);
    }
  }
  console.log('\n✅ Octocat hooks uninstalled.');
}

try {
  uninstall();
} catch (err) {
  console.error(`Failed to uninstall hooks: ${err.message}`);
  process.exit(1);
}
