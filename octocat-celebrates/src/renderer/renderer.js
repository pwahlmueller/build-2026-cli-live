const octocat = document.getElementById('octocat');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');
const confetti = document.getElementById('confetti');

const ANIMATION_CLASSES = ['commit', 'merge', 'push', 'checkout', 'rewrite'];

const EVENT_CONFIG = {
  'post-commit':   { cls: 'commit',   text: 'Nice commit! ✅',     confetti: true },
  'post-merge':    { cls: 'merge',    text: 'Merged! 🎉',          confetti: true },
  'pre-push':      { cls: 'push',     text: 'Shipping it! 🚀',     confetti: false },
  'post-checkout': { cls: 'checkout', text: 'New branch? 👀',      confetti: false },
  'post-rewrite':  { cls: 'rewrite',  text: 'History rewritten 🌀', confetti: false }
};

const COLORS = ['#2da44e', '#0969da', '#bf3989', '#fb8f44', '#8250df', '#f0c419'];

let resetTimer = null;

function clearAnimation() {
  octocat.classList.remove(...ANIMATION_CLASSES);
  // Force reflow so the same animation can replay back-to-back.
  void octocat.offsetWidth;
  octocat.classList.add('idle');
}

function showBubble(text) {
  bubbleText.textContent = text;
  bubble.classList.remove('hidden');
}

function hideBubble() {
  bubble.classList.add('hidden');
}

function burstConfetti() {
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = 45 + Math.random() * 10 + '%';
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    piece.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
    piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    confetti.appendChild(piece);
    requestAnimationFrame(() => piece.classList.add('go'));
    setTimeout(() => piece.remove(), 1000);
  }
}

function celebrate(type) {
  const cfg = EVENT_CONFIG[type];
  if (!cfg) return;

  if (resetTimer) clearTimeout(resetTimer);

  octocat.classList.remove('idle', ...ANIMATION_CLASSES);
  void octocat.offsetWidth; // restart animation
  octocat.classList.add(cfg.cls);

  showBubble(cfg.text);
  if (cfg.confetti) burstConfetti();

  resetTimer = setTimeout(() => {
    clearAnimation();
    hideBubble();
  }, 2600);
}

// Idle blink loop.
function scheduleBlink() {
  const delay = 2500 + Math.random() * 3000;
  setTimeout(() => {
    if (octocat.classList.contains('idle')) {
      octocat.classList.add('blink');
      setTimeout(() => octocat.classList.remove('blink'), 160);
    }
    scheduleBlink();
  }, delay);
}
scheduleBlink();

if (window.octocat && window.octocat.onGitEvent) {
  window.octocat.onGitEvent(({ type }) => celebrate(type));
}

document.getElementById('close').addEventListener('click', () => {
  if (window.octocat) window.octocat.quit();
});

// Manual testing from devtools: window.__test('post-commit')
window.__test = celebrate;
